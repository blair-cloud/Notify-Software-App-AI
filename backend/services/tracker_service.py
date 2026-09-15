import csv
import io
import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload

from backend.models import (
    TenantProfile, Property, Unit, Tenancy, Lease,
    Invoice, Payment, PaymentMethod, PaymentChannel, PaymentStatus,
    InvoiceStatus, LeaseStatus, RentSchedule, RentScheduleStatus,
)
from backend.models.tracker import BankAccount, BankStatement, BankTransaction, PaymentMatch, TrackerCorrection
from backend.core.tracker_config import (
    MATCH_WEIGHTS,
    CORRECTION_LEARNING_BOOST,
    CONFIDENCE_THRESHOLDS,
    AMBIGUITY_SCORE_DELTA,
    AMBIGUITY_MIN_SCORE,
    DEFAULT_CURRENCY,
)
from backend.services.bank_statement_ai import BankStatementAIService
from backend.services.bank_statement_normalizer import BankStatementNormalizer
from backend.services.payment_service import PaymentService
from backend.core.logging import logger


OPEN_INVOICE_STATUSES = (
    InvoiceStatus.ISSUED,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.OVERDUE,
)

ACTIVE_LEASE_STATUSES = (
    LeaseStatus.ACTIVE,
    LeaseStatus.EXPIRING_SOON,
)


@dataclass
class ExpectedPayment:
    """A tenant payment expected within the analysis window."""
    tenant_id: uuid.UUID
    tenant_name: str
    tenant_email: Optional[str]
    tenant_phone: Optional[str]
    lease_id: uuid.UUID
    property_id: uuid.UUID
    property_name: str
    unit_id: uuid.UUID
    unit_number: str
    expected_amount: float
    balance_due: float
    due_date: date
    invoice_id: Optional[uuid.UUID] = None
    invoice_number: Optional[str] = None
    source: str = "LEASE_SCHEDULE"  # INVOICE | LEASE_SCHEDULE | RENT_SCHEDULE
    signals_hint: List[str] = field(default_factory=list)


@dataclass
class MatchCandidate:
    expected: ExpectedPayment
    score: float
    match_score: int
    confidence_level: str  # AUTO_MATCH | STRONG_MATCH | REVIEW_REQUIRED | UNMATCHED
    reasons: List[str]
    warnings: List[str]
    signals: List[str]
    method: str
    amount_kind: str  # FULLY_PAID | PARTIALLY_PAID | OVERPAID | AMOUNT_REVIEW
    match_summary: str = ""
    name_kind: str = "NONE"
    bank_statement_name: str = ""
    possible_matches: List[Dict[str, Any]] = field(default_factory=list)


class TrackerService:

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------

    @staticmethod
    def parse_amount(val: Any) -> float:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        val_str = str(val).strip().replace(',', '').replace('RWF', '').replace('USD', '').replace('FRW', '').replace(' ', '')
        try:
            return abs(float(val_str))
        except ValueError:
            return 0.0

    @staticmethod
    def parse_date(val: Any) -> Optional[date]:
        if not val:
            return None
        if isinstance(val, date) and not isinstance(val, datetime):
            return val
        if isinstance(val, datetime):
            return val.date()
        val_str = str(val).strip()
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d.%m.%Y",
            "%Y/%m/%d", "%d %b %Y", "%d-%b-%Y", "%d %B %Y",
            "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val_str[:19], fmt).date()
            except Exception:
                continue
        m_iso = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', val_str)
        if m_iso:
            try:
                return date(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)))
            except Exception:
                pass
        m_dmy = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', val_str)
        if m_dmy:
            try:
                return date(int(m_dmy.group(3)), int(m_dmy.group(2)), int(m_dmy.group(1)))
            except Exception:
                pass
        return None

    @staticmethod
    def extract_payer_name(description: str) -> Optional[str]:
        if not description:
            return None
        desc = description.strip()
        patterns = [
            r'(?:FROM|FRM|BY|DE|TRANSFER FROM|TRF FROM|MOMO FROM)\s+([A-Za-z\s\'-]{3,40})(?:TO|REF|UNIT|FOR|INV|\/|-|$)',
            r'(?:PAYMENT FROM|RECEIVED FROM)\s+([A-Za-z\s\'-]{3,40})',
            r'^([A-Za-z\s\'-]{4,30})\s+(?:RENT|PAYMENT|UNIT)',
            r'(?:BK TRF|IM TRF|EQUITY TRF|BPR TRF):\s*([A-Za-z\s\'-]{3,40})',
        ]
        for pat in patterns:
            match = re.search(pat, desc, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if len(candidate) > 2 and not re.match(
                    r'^(TRANSFER|PAYMENT|MOMO|BK|REF|DEPOSIT|BANK)$', candidate, re.IGNORECASE
                ):
                    return candidate
        return None

    @staticmethod
    def _tenant_identity(tenant: TenantProfile) -> Tuple[str, Optional[str], Optional[str]]:
        """Resolve display name / email / phone from linked User or pending invite fields."""
        user = getattr(tenant, "user", None)
        if user:
            name = f"{user.first_name or ''} {user.last_name or ''}".strip()
            return name or "Not available", user.email, user.phone
        name = f"{tenant.pending_first_name or ''} {tenant.pending_last_name or ''}".strip()
        return name or "Not available", tenant.pending_email, tenant.pending_phone

    @staticmethod
    def _normalize_phone(phone: Optional[str]) -> str:
        if not phone:
            return ""
        digits = re.sub(r'\D', '', phone)
        if digits.startswith('250') and len(digits) > 9:
            digits = digits[-9:]
        if digits.startswith('0') and len(digits) == 10:
            digits = digits[1:]
        return digits

    @staticmethod
    def _tokenize_name(name: Optional[str]) -> str:
        if not name:
            return ""
        # Drop punctuation so "Jean-Bosco" ~ "Jean Bosco", keep letters/digits/spaces
        cleaned = re.sub(r"[^A-Za-z0-9\s]", " ", name.upper())
        return re.sub(r"\s+", " ", cleaned).strip()

    @staticmethod
    def _name_tokens(name: Optional[str]) -> List[str]:
        return [t for t in TrackerService._tokenize_name(name).split() if len(t) >= 2]

    @staticmethod
    def _token_spell_similar(a: str, b: str) -> bool:
        """True when tokens are close enough to be spelling variants."""
        if not a or not b:
            return False
        if a == b:
            return True
        # Common shortenings / prefixes: JEAN vs JEANBOSCO, CLAUD vs CLAUDINE
        shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
        if len(shorter) >= 3 and longer.startswith(shorter) and len(longer) - len(shorter) <= 5:
            return True
        if len(a) >= 4 and len(b) >= 4 and SequenceMatcher(None, a, b).ratio() >= 0.82:
            return True
        # Single-edit tolerance for mid-length names
        if len(a) >= 5 and len(b) >= 5 and SequenceMatcher(None, a, b).ratio() >= 0.75:
            return True
        return False

    @staticmethod
    def _name_similarity(a: Optional[str], b: Optional[str]) -> float:
        """Backward-compatible scalar similarity (0–1). Prefer _analyze_name_match. """
        score, _kind, _note = TrackerService._analyze_name_match(a, b)
        return score

    @staticmethod
    def _analyze_name_match(
        registered_name: Optional[str],
        bank_name: Optional[str],
    ) -> Tuple[float, str, str]:
        """
        Compare a registered tenant name with a bank-statement payer/narration name.

        Handles: exact, reordered, single-token, extra middle names, shortenings,
        and spelling variations.

        Returns (score 0–1, kind, human note).
        kind ∈ EXACT | REORDERED | PARTIAL | SHORTENED | SPELLING | WEAK | NONE
        """
        reg = TrackerService._tokenize_name(registered_name)
        bank = TrackerService._tokenize_name(bank_name)
        if not reg or not bank:
            return 0.0, "NONE", ""

        if reg == bank:
            return 1.0, "EXACT", f"Exact name match with registered tenant ({registered_name})"

        # Containment of full strings (extra bank narration noise)
        if reg in bank or bank in reg:
            return 0.94, "PARTIAL", (
                f"Bank-statement name contains the registered name "
                f"“{registered_name}”"
            )

        reg_tokens = TrackerService._name_tokens(registered_name)
        bank_tokens = TrackerService._name_tokens(bank_name)
        if not reg_tokens or not bank_tokens:
            ratio = SequenceMatcher(None, reg, bank).ratio()
            if ratio >= 0.85:
                return ratio, "SPELLING", (
                    f"This bank-statement name appears to match {registered_name} "
                    f"(spelling variation)."
                )
            return ratio, "WEAK" if ratio >= 0.5 else "NONE", ""

        # Reordered: same multiset of tokens
        if set(reg_tokens) == set(bank_tokens) and len(reg_tokens) == len(bank_tokens):
            return 0.96, "REORDERED", (
                f"This bank-statement name appears to match {registered_name} "
                f"(same names, different order)."
            )

        # Exact token overlap
        exact_overlap = set(reg_tokens) & set(bank_tokens)

        # Fuzzy token pairing for spelling / shortened forms
        fuzzy_pairs: List[Tuple[str, str]] = []
        used_bank: set = set()
        for rt in reg_tokens:
            if rt in exact_overlap:
                continue
            for bt in bank_tokens:
                if bt in exact_overlap or bt in used_bank:
                    continue
                if TrackerService._token_spell_similar(rt, bt):
                    fuzzy_pairs.append((rt, bt))
                    used_bank.add(bt)
                    break

        matched_reg = len(exact_overlap) + len(fuzzy_pairs)
        coverage = matched_reg / max(len(reg_tokens), 1)
        bank_coverage = (len(exact_overlap) + len(fuzzy_pairs)) / max(len(bank_tokens), 1)
        seq_ratio = SequenceMatcher(None, reg, bank).ratio()

        # Single-name bank narration matching a multi-part registered name
        if len(bank_tokens) == 1 and matched_reg >= 1:
            token = bank_tokens[0]
            if token in exact_overlap or any(bt == token for _, bt in fuzzy_pairs):
                note = (
                    f"This bank-statement name appears to match {registered_name} "
                    f"(single name “{token.title()}” from the registered full name)."
                )
                return max(0.70, 0.55 + 0.2 * coverage), "PARTIAL", note

        if coverage >= 0.99 and not fuzzy_pairs and len(bank_tokens) > len(reg_tokens):
            return 0.90, "PARTIAL", (
                f"This bank-statement name appears to match {registered_name} "
                f"(registered names present plus additional names on the statement)."
            )

        if coverage >= 0.66 and fuzzy_pairs and not exact_overlap:
            pair_txt = ", ".join(f"{a}≈{b}" for a, b in fuzzy_pairs[:2])
            return max(0.78, seq_ratio), "SPELLING", (
                f"This bank-statement name appears to match {registered_name} "
                f"(spelling variation: {pair_txt})."
            )

        if coverage >= 0.66 and fuzzy_pairs:
            return max(0.82, seq_ratio), "SHORTENED", (
                f"This bank-statement name appears to match {registered_name} "
                f"(shortened or variant name forms)."
            )

        if coverage >= 0.66:
            return max(0.80, coverage * 0.9, seq_ratio), "PARTIAL", (
                f"This bank-statement name appears to match {registered_name} "
                f"(shared name parts: {', '.join(sorted(exact_overlap))})."
            )

        if coverage >= 0.4 or seq_ratio >= 0.72:
            return max(coverage * 0.75, seq_ratio * 0.9), "WEAK", (
                f"This bank-statement name may relate to {registered_name} "
                f"— confirm carefully."
            )

        # Last-name only fallback for Rwandan bank narrations
        if reg_tokens:
            last = reg_tokens[-1]
            if len(last) >= 4 and any(
                TrackerService._token_spell_similar(last, bt) or last == bt for bt in bank_tokens
            ):
                return 0.68, "PARTIAL", (
                    f"This bank-statement name appears to match {registered_name} "
                    f"(family name “{last.title()}”)."
                )

        return max(seq_ratio * bank_coverage, 0.0), "NONE", ""

    @staticmethod
    def _amount_status(txn_amt: float, balance: float, expected: float) -> Tuple[str, str]:
        """
        Classify payment amount vs expected/balance.
        Returns (code, landlord-facing label).
        code ∈ FULLY_PAID | PARTIALLY_PAID | OVERPAID | AMOUNT_REVIEW
        """
        ref = balance if balance > 0 else expected
        if ref <= 0:
            return "AMOUNT_REVIEW", "Different amount — needs review"
        if abs(txn_amt - ref) <= 10.0:
            return "FULLY_PAID", "Fully paid"
        if abs(txn_amt - expected) <= 10.0 and expected > 0:
            return "FULLY_PAID", "Fully paid (matches expected rent)"
        if 0 < txn_amt < ref - 10:
            pct = round(txn_amt / ref * 100)
            return "PARTIALLY_PAID", f"Partially paid ({pct}% of expected)"
        if txn_amt > ref + 10:
            return "OVERPAID", "Overpaid / higher than expected"
        return "AMOUNT_REVIEW", "Different amount — needs review"

    @staticmethod
    def _compose_match_summary(
        bank_name: Optional[str],
        tenant_name: str,
        name_note: str,
        signals: List[str],
        amount_label: str,
    ) -> str:
        """Landlord-facing one-liner explaining the suggested match."""
        bank_label = (bank_name or "").strip() or "this bank-statement name"
        if name_note and "appears to match" in name_note.lower():
            lead = name_note.rstrip(".")
        elif name_note and "Exact name" in name_note:
            lead = f"Bank-statement name “{bank_label}” matches registered tenant {tenant_name}"
        elif tenant_name:
            lead = f"This bank-statement name appears to match {tenant_name}"
        else:
            return ""

        why_bits: List[str] = []
        joined = " | ".join(signals).lower()
        if any(k in joined for k in ("name", "appears to match", "spelling", "family name", "shortened")):
            why_bits.append("similar name")
        if "invoice reference" in joined or "unit" in joined:
            why_bits.append("matching reference")
        if any(k in joined for k in ("exact balance", "exact expected", "fully", "partial", "overpay")):
            why_bits.append("expected amount")
        elif amount_label:
            why_bits.append(amount_label.lower())
        if "due date" in joined or "billing window" in joined or "paid on due" in joined:
            why_bits.append("payment date")
        if "phone" in joined:
            why_bits.append("phone")

        # de-dupe preserving order
        seen = set()
        why_clean = []
        for w in why_bits:
            if w not in seen:
                seen.add(w)
                why_clean.append(w)

        if why_clean:
            return f"{lead}. Why: {' + '.join(why_clean)}."
        return f"{lead}."

    @staticmethod
    def parse_statement_content(content_str: str, file_name: str) -> List[Dict[str, Any]]:
        """Parses CSV, TSV, or structured bank export text into normalized transaction dicts."""
        transactions: List[Dict[str, Any]] = []

        try:
            reader = csv.reader(io.StringIO(content_str))
            rows = list(reader)
            if not rows:
                return []

            header_idx = -1
            headers: List[str] = []
            for i, row in enumerate(rows[:10]):
                joined = " ".join(row).lower()
                if any(kw in joined for kw in ["date", "description", "details", "narration", "credit", "amount", "balance"]):
                    header_idx = i
                    headers = [c.strip().lower() for c in row]
                    break

            if header_idx != -1:
                date_col = desc_col = amount_col = credit_col = debit_col = ref_col = payer_col = -1

                for idx, h in enumerate(headers):
                    if "date" in h or "txn date" in h or "value date" in h:
                        if date_col == -1 or "txn" in h:
                            date_col = idx
                    elif any(k in h for k in ["desc", "detail", "narration", "particular", "remark"]):
                        desc_col = idx
                    elif "credit" in h or "deposit" in h or "inflow" in h:
                        credit_col = idx
                    elif "debit" in h or "withdrawal" in h or "outflow" in h:
                        debit_col = idx
                    elif "amount" in h:
                        amount_col = idx
                    elif any(k in h for k in ["ref", "txn id", "trans id", "cheque", "reference"]):
                        ref_col = idx
                    elif any(k in h for k in ["payer", "sender", "beneficiary", "party"]):
                        payer_col = idx

                for row in rows[header_idx + 1:]:
                    if not row or all(not str(cell).strip() for cell in row):
                        continue

                    txn_date_val = row[date_col] if date_col != -1 and date_col < len(row) else None
                    txn_date = TrackerService.parse_date(txn_date_val) or date.today()

                    desc = row[desc_col] if desc_col != -1 and desc_col < len(row) else ""
                    if not desc and len(row) > 1:
                        desc = " ".join([c for c in row if c])

                    amount = 0.0
                    is_credit = True

                    if credit_col != -1 and credit_col < len(row) and str(row[credit_col]).strip():
                        val = TrackerService.parse_amount(row[credit_col])
                        if val > 0:
                            amount = val
                            is_credit = True
                    elif amount_col != -1 and amount_col < len(row) and str(row[amount_col]).strip():
                        amount = TrackerService.parse_amount(row[amount_col])
                        is_credit = True
                    elif debit_col != -1 and debit_col < len(row) and str(row[debit_col]).strip():
                        amount = TrackerService.parse_amount(row[debit_col])
                        is_credit = False

                    if amount <= 0:
                        continue

                    ref = row[ref_col].strip() if ref_col != -1 and ref_col < len(row) and row[ref_col] else None
                    if not ref:
                        ref_match = re.search(r'(?:REF|TXN|ID|INV|RCT)[:\s-]*([A-Z0-9-]{6,25})', desc, re.IGNORECASE)
                        ref = ref_match.group(1).upper() if ref_match else f"TXN-{uuid.uuid4().hex[:10].upper()}"

                    payer = row[payer_col].strip() if payer_col != -1 and payer_col < len(row) and row[payer_col] else None
                    if not payer:
                        payer = TrackerService.extract_payer_name(desc)

                    transactions.append({
                        "transaction_reference": ref,
                        "transaction_date": txn_date,
                        "amount": amount,
                        "currency": "RWF",
                        "is_credit": is_credit,
                        "payer_name": payer,
                        "description": desc,
                        "raw_text": ",".join(str(c) for c in row),
                    })
        except Exception as e:
            logger.error(f"Error parsing CSV statement: {e}")

        if not transactions:
            for line in content_str.splitlines():
                if not line.strip() or len(line.strip()) < 10:
                    continue
                d = TrackerService.parse_date(line)
                amt_match = re.findall(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)', line)
                if amt_match:
                    amt_candidates = [TrackerService.parse_amount(a) for a in amt_match]
                    valid_amts = [a for a in amt_candidates if a >= 1000]
                    if valid_amts:
                        chosen_amt = max(valid_amts)
                        payer = TrackerService.extract_payer_name(line)
                        ref_match = re.search(r'([A-Z0-9]{8,20})', line)
                        ref = ref_match.group(1) if ref_match else f"TXN-{uuid.uuid4().hex[:10].upper()}"
                        transactions.append({
                            "transaction_reference": ref,
                            "transaction_date": d or date.today(),
                            "amount": chosen_amt,
                            "currency": "RWF",
                            "is_credit": True,
                            "payer_name": payer,
                            "description": line.strip(),
                            "raw_text": line.strip(),
                        })

        return transactions

    # ------------------------------------------------------------------
    # Expected payments for the analysis window
    # ------------------------------------------------------------------

    @staticmethod
    async def build_expected_payments(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID],
        window_start: date,
        window_end: date,
    ) -> List[ExpectedPayment]:
        """
        Identify tenants expected to pay within [window_start, window_end]
        from open invoices, active leases (payment_due_day), and rent schedules.
        """
        # Widen slightly so late payments near the window still surface.
        lookback = window_start - timedelta(days=45)
        lookahead = window_end + timedelta(days=14)

        prop_query = select(Property).where(Property.landlord_id == landlord_id)
        if property_id:
            prop_query = prop_query.where(Property.id == property_id)
        props = list((await session.execute(prop_query)).scalars().all())
        prop_ids = [p.id for p in props]
        prop_by_id = {p.id: p for p in props}
        if not prop_ids:
            return []

        lease_query = (
            select(Lease, TenantProfile, Unit)
            .join(TenantProfile, TenantProfile.id == Lease.tenant_id)
            .join(Unit, Unit.id == Lease.unit_id)
            .options(selectinload(TenantProfile.user))
            .where(
                Lease.landlord_id == landlord_id,
                Lease.property_id.in_(prop_ids),
                Lease.status.in_(ACTIVE_LEASE_STATUSES),
            )
        )
        lease_rows = (await session.execute(lease_query)).all()

        inv_query = (
            select(Invoice)
            .where(
                Invoice.landlord_id == landlord_id,
                Invoice.property_id.in_(prop_ids),
                Invoice.status.in_(OPEN_INVOICE_STATUSES),
                or_(
                    and_(Invoice.due_date >= lookback, Invoice.due_date <= lookahead),
                    and_(
                        Invoice.billing_period_start <= lookahead,
                        Invoice.billing_period_end >= lookback,
                    ),
                ),
            )
        )
        invoices = list((await session.execute(inv_query)).scalars().all())
        invoices_by_lease: Dict[uuid.UUID, List[Invoice]] = {}
        for inv in invoices:
            invoices_by_lease.setdefault(inv.lease_id, []).append(inv)

        sched_query = (
            select(RentSchedule)
            .where(
                RentSchedule.landlord_id == landlord_id,
                RentSchedule.property_id.in_(prop_ids),
                RentSchedule.status == RentScheduleStatus.ACTIVE,
            )
        )
        schedules = list((await session.execute(sched_query)).scalars().all())
        sched_by_lease = {s.lease_id: s for s in schedules}

        expected: List[ExpectedPayment] = []
        seen_invoice_ids: set = set()

        for lease, tenant, unit in lease_rows:
            name, email, phone = TrackerService._tenant_identity(tenant)
            prop = prop_by_id.get(lease.property_id)
            prop_name = prop.name if prop else "Property"
            due_day = int(lease.payment_due_day or 5)

            lease_invs = invoices_by_lease.get(lease.id, [])
            # Prefer invoices whose due date falls in / near the analysis window
            period_invs = [
                i for i in lease_invs
                if i.due_date and lookback <= i.due_date <= lookahead
            ] or lease_invs

            if period_invs:
                for inv in period_invs:
                    if inv.id in seen_invoice_ids:
                        continue
                    seen_invoice_ids.add(inv.id)
                    expected.append(ExpectedPayment(
                        tenant_id=tenant.id,
                        tenant_name=name,
                        tenant_email=email,
                        tenant_phone=phone,
                        lease_id=lease.id,
                        property_id=lease.property_id,
                        property_name=prop_name,
                        unit_id=unit.id,
                        unit_number=unit.unit_number,
                        expected_amount=float(inv.total_amount),
                        balance_due=float(inv.balance_due if inv.balance_due is not None else inv.total_amount),
                        due_date=inv.due_date,
                        invoice_id=inv.id,
                        invoice_number=inv.invoice_number,
                        source="INVOICE",
                        signals_hint=[f"Open invoice {inv.invoice_number} due {inv.due_date}"],
                    ))
                continue

            # No open invoice — synthesize expected from rent schedule or lease due day
            schedule = sched_by_lease.get(lease.id)
            amount = float(schedule.amount) if schedule else float(lease.monthly_rent or unit.monthly_rent or 0)
            if schedule:
                due_day = int(schedule.due_day or due_day)
                source = "RENT_SCHEDULE"
            else:
                source = "LEASE_SCHEDULE"

            # Build due dates for each month touched by the window
            cursor = date(window_start.year, window_start.month, 1)
            end_month = date(window_end.year, window_end.month, 1)
            while cursor <= end_month:
                try:
                    due = date(cursor.year, cursor.month, min(due_day, 28))
                except Exception:
                    due = cursor + timedelta(days=4)
                if lookback <= due <= lookahead:
                    expected.append(ExpectedPayment(
                        tenant_id=tenant.id,
                        tenant_name=name,
                        tenant_email=email,
                        tenant_phone=phone,
                        lease_id=lease.id,
                        property_id=lease.property_id,
                        property_name=prop_name,
                        unit_id=unit.id,
                        unit_number=unit.unit_number,
                        expected_amount=amount,
                        balance_due=amount,
                        due_date=due,
                        invoice_id=None,
                        invoice_number=None,
                        source=source,
                        signals_hint=[f"Expected rent due {due} (day {due_day})"],
                    ))
                if cursor.month == 12:
                    cursor = date(cursor.year + 1, 1, 1)
                else:
                    cursor = date(cursor.year, cursor.month + 1, 1)

        return expected

    # ------------------------------------------------------------------
    # Multi-signal matching
    # ------------------------------------------------------------------

    @staticmethod
    def _score_against_expected(
        transaction: BankTransaction,
        expected: ExpectedPayment,
        historical_corrections: Optional[List[TrackerCorrection]] = None,
    ) -> MatchCandidate:
        """
        Deterministic matching calculation based on configurable weights:
        - Amount match: 40%
        - Name similarity: 25%
        - Invoice / reference number: 15%
        - Payment date vs invoice due date: 15%
        - Property / unit context: 5%
        - Correction learning boost: +15% if recognized historical pattern
        """
        txn_ref = (transaction.transaction_reference or "").strip().upper()
        txn_desc = (transaction.description or "").strip()
        txn_payer = (transaction.payer_name or "").strip()
        cleaned_desc = BankStatementNormalizer.normalize_description(txn_desc)
        norm_payer = BankStatementNormalizer.normalize_name(txn_payer)
        haystack = f"{txn_desc.upper()} {norm_payer.upper()} {txn_ref}"

        txn_amt = float(transaction.amount)
        txn_date = transaction.transaction_date

        score = 0.0
        reasons: List[str] = []
        warnings: List[str] = []
        signals: List[str] = []
        method_bits: List[str] = []

        # ------------------------------------------------------------------
        # 1) Amount Match (40% Weight)
        # ------------------------------------------------------------------
        bal = float(expected.balance_due or expected.expected_amount or 0)
        exp_amt = float(expected.expected_amount or bal)
        amount_weight = MATCH_WEIGHTS.get("amount", 0.40)
        amount_kind = "AMOUNT_REVIEW"

        if bal > 0:
            diff = abs(txn_amt - bal)
            if diff < 0.01:
                score += amount_weight
                amount_kind = "FULLY_PAID"
                reasons.append(f"Amount matches invoice balance exactly (RWF {txn_amt:,.0f})")
                method_bits.append("AMOUNT_EXACT")
            elif diff <= 500 or (diff / bal) <= 0.01:
                # Small variance (e.g. transfer fee deduction)
                score += amount_weight * 0.90
                amount_kind = "FULLY_PAID"
                reasons.append(f"Amount matches invoice within fee variance (RWF {txn_amt:,.0f} vs RWF {bal:,.0f})")
                method_bits.append("AMOUNT_NEAR")
            elif txn_amt < bal:
                ratio = txn_amt / bal
                score += amount_weight * 0.60 * ratio
                amount_kind = "PARTIALLY_PAID"
                reasons.append(f"Partial payment: RWF {txn_amt:,.0f} of RWF {bal:,.0f} ({ratio:.0%})")
                method_bits.append("AMOUNT_PARTIAL")
            elif txn_amt > bal:
                score += amount_weight * 0.65
                amount_kind = "OVERPAID"
                reasons.append(f"Overpayment: RWF {txn_amt:,.0f} exceeds balance RWF {bal:,.0f}")
                warnings.append(f"Payment exceeds invoice balance by RWF {(txn_amt - bal):,.0f}")
                method_bits.append("AMOUNT_OVER")
        else:
            amount_kind = "AMOUNT_REVIEW"
            warnings.append("Invoice has zero balance due")

        # ------------------------------------------------------------------
        # 2) Tenant Name Similarity (25% Weight)
        # ------------------------------------------------------------------
        name_weight = MATCH_WEIGHTS.get("name", 0.25)
        # Check against payer name and transaction description
        sim_payer, kind_payer, reason_payer = BankStatementNormalizer.name_similarity(
            expected.tenant_name, txn_payer
        )
        sim_desc, kind_desc, reason_desc = BankStatementNormalizer.name_similarity(
            expected.tenant_name, cleaned_desc
        )

        best_sim, name_kind, name_reason = (
            (sim_payer, kind_payer, reason_payer)
            if sim_payer >= sim_desc
            else (sim_desc, kind_desc, reason_desc)
        )

        if best_sim >= 0.95 or name_kind in ("EXACT", "CONTAINED", "REORDERED"):
            score += name_weight
            reasons.append(f"Tenant name similarity: {int(best_sim * 100)}% ({expected.tenant_name})")
            method_bits.append(f"NAME_{name_kind}")
        elif best_sim >= 0.75:
            score += name_weight * best_sim
            reasons.append(f"Tenant name similarity: {int(best_sim * 100)}% ({expected.tenant_name})")
            method_bits.append("NAME_SIMILAR")
        elif best_sim >= 0.50:
            score += name_weight * best_sim * 0.70
            reasons.append(f"Partial tenant name match ({int(best_sim * 100)}%)")
            method_bits.append("NAME_PARTIAL")
        else:
            if not txn_payer:
                warnings.append("No payer name found in statement description")

        # ------------------------------------------------------------------
        # 3) Invoice / Reference Number (15% Weight)
        # ------------------------------------------------------------------
        ref_weight = MATCH_WEIGHTS.get("reference", 0.15)
        extracted_refs = BankStatementNormalizer.extract_references(f"{txn_desc} {txn_ref}")
        inv_num = (expected.invoice_number or "").upper().strip()
        ref_matched = False

        if inv_num:
            compact_inv = inv_num.replace("-", "").replace("#", "")
            # Check direct containment or extracted references
            if (
                inv_num in haystack
                or compact_inv in haystack.replace("-", "").replace("#", "")
                or any(r in inv_num or inv_num in r for r in extracted_refs.get("invoice_numbers", []))
            ):
                score += ref_weight
                reasons.append(f"Invoice reference #{expected.invoice_number} found in transaction description")
                method_bits.append("INVOICE_REF")
                ref_matched = True

        if not ref_matched and txn_ref and len(txn_ref) >= 6:
            if inv_num and (txn_ref in inv_num or inv_num in txn_ref):
                score += ref_weight * 0.80
                reasons.append(f"Transaction reference matches invoice format: {txn_ref}")
                method_bits.append("REF_ID")
                ref_matched = True

        # Check tenant phone number
        phone_norm = TrackerService._normalize_phone(expected.tenant_phone)
        if phone_norm and len(phone_norm) >= 8:
            desc_digits = re.sub(r'\D', '', f"{txn_desc} {txn_payer}")
            if phone_norm in desc_digits or phone_norm[-9:] in desc_digits:
                score += ref_weight * 0.75
                reasons.append(f"Tenant phone number ({expected.tenant_phone}) detected in narration")
                method_bits.append("PHONE_MATCH")

        # ------------------------------------------------------------------
        # 4) Payment Date vs Due Date Proximity (15% Weight)
        # ------------------------------------------------------------------
        date_weight = MATCH_WEIGHTS.get("date_proximity", 0.15)
        if expected.due_date and txn_date:
            delta_signed = (txn_date - expected.due_date).days
            abs_delta = abs(delta_signed)
            if abs_delta == 0:
                score += date_weight
                reasons.append(f"Payment received on exact due date ({expected.due_date})")
                method_bits.append("DATE_EXACT")
            elif abs_delta <= 3:
                score += date_weight * 0.90
                when = "after" if delta_signed > 0 else "before"
                reasons.append(f"Payment received {abs_delta} day(s) {when} due date ({expected.due_date})")
                method_bits.append("DATE_NEAR")
            elif abs_delta <= 7:
                score += date_weight * 0.70
                when = "after" if delta_signed > 0 else "before"
                reasons.append(f"Payment received within 1 week {when} due date")
                method_bits.append("DATE_WEEK")
            elif abs_delta <= 31:
                score += date_weight * 0.40
                reasons.append("Payment received within billing cycle window")
                method_bits.append("DATE_WINDOW")
            else:
                if delta_signed > 31:
                    warnings.append(f"Payment received {delta_signed} days after due date")

        # ------------------------------------------------------------------
        # 5) Property / Unit Context (5% Weight)
        # ------------------------------------------------------------------
        ctx_weight = MATCH_WEIGHTS.get("property_context", 0.05)
        unit_str = (expected.unit_number or "").strip().upper()
        prop_str = (expected.property_name or "").strip().upper()

        if unit_str and (f"UNIT {unit_str}" in haystack or f"U-{unit_str}" in haystack or f"#{unit_str}" in haystack):
            score += ctx_weight * 0.80
            reasons.append(f"Unit '{expected.unit_number}' found in narration")
            method_bits.append("UNIT_CONTEXT")
        elif prop_str and len(prop_str) >= 4 and prop_str in haystack:
            score += ctx_weight * 0.60
            reasons.append(f"Property name '{expected.property_name}' found in narration")
            method_bits.append("PROP_CONTEXT")

        # ------------------------------------------------------------------
        # 6) Learning from Corrections Boost
        # ------------------------------------------------------------------
        if historical_corrections:
            for corr in historical_corrections:
                if corr.action == "CONFIRMED" and corr.matched_tenant_id == expected.tenant_id:
                    matched_pattern = False
                    if corr.payer_name_pattern and norm_payer and corr.payer_name_pattern in norm_payer:
                        matched_pattern = True
                    elif corr.description_pattern and corr.description_pattern in cleaned_desc.lower():
                        matched_pattern = True

                    if matched_pattern:
                        score += CORRECTION_LEARNING_BOOST
                        reasons.append("Matches known landlord-confirmed payer pattern")
                        method_bits.append("LEARNED_CORRECTION")
                        break

        # Calculate final match score (0 - 100) and confidence level
        capped_score = min(1.0, round(score, 4))
        match_score = int(round(capped_score * 100))

        if match_score >= CONFIDENCE_THRESHOLDS["AUTO_MATCH"]:
            confidence_level = "AUTO_MATCH"
        elif match_score >= CONFIDENCE_THRESHOLDS["STRONG_MATCH"]:
            confidence_level = "STRONG_MATCH"
        elif match_score >= CONFIDENCE_THRESHOLDS["REVIEW_REQUIRED"]:
            confidence_level = "REVIEW_REQUIRED"
        else:
            confidence_level = "UNMATCHED"

        method = "+".join(method_bits) if method_bits else "UNMATCHED"
        match_summary = TrackerService._compose_match_summary(
            transaction.payer_name or "",
            expected.tenant_name,
            name_reason,
            reasons,
            amount_kind,
        )

        return MatchCandidate(
            expected=expected,
            score=capped_score,
            match_score=match_score,
            confidence_level=confidence_level,
            reasons=reasons,
            warnings=warnings,
            signals=signals + reasons,
            method=method,
            amount_kind=amount_kind,
            match_summary=match_summary,
            name_kind=name_kind,
            bank_statement_name=transaction.payer_name or "",
        )

    @staticmethod
    async def match_transaction(
        session: AsyncSession,
        transaction: BankTransaction,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None,
        expected_payments: Optional[List[ExpectedPayment]] = None,
        historical_corrections: Optional[List[TrackerCorrection]] = None,
    ) -> Tuple[Optional[ExpectedPayment], float, str, List[str], str, str, str, str, List[Dict[str, Any]], int, str, List[str], List[str]]:
        """
        Rank expected payments against a bank credit using multi-signal scoring.
        Returns:
            (best_expected, score, method, signals, status, amount_kind, match_summary, bank_name,
             possible_matches, match_score, confidence_level, reasons, warnings)
        """
        if not transaction.is_credit:
            return (
                None, 0.0, "DEBIT_SKIPPED", ["Outgoing debit ignored"],
                "UNMATCHED", "AMOUNT_REVIEW", "", transaction.payer_name or "",
                [], 0, "UNMATCHED", ["Outgoing debit ignored"], []
            )

        if expected_payments is None:
            txn_date = transaction.transaction_date or date.today()
            expected_payments = await TrackerService.build_expected_payments(
                session, landlord_id, property_id, txn_date - timedelta(days=45), txn_date + timedelta(days=14)
            )

        if not expected_payments:
            return (
                None, 0.0, "NO_EXPECTED",
                ["No expected tenant payments in analysis window"],
                "UNMATCHED", "AMOUNT_REVIEW", "", transaction.payer_name or "",
                [], 0, "UNMATCHED", ["No expected tenant payments in analysis window"], []
            )

        # Retrieve historical corrections for this landlord if not passed
        if historical_corrections is None:
            c_res = await session.execute(
                select(TrackerCorrection).where(TrackerCorrection.landlord_id == landlord_id)
            )
            historical_corrections = list(c_res.scalars().all())

        ranked = [
            TrackerService._score_against_expected(transaction, exp, historical_corrections)
            for exp in expected_payments
        ]
        ranked.sort(key=lambda c: c.score, reverse=True)
        best = ranked[0]
        second = ranked[1] if len(ranked) > 1 else None

        possible_matches: List[Dict[str, Any]] = []

        # ------------------------------------------------------------------
        # Ambiguity Check: Multiple close candidates -> NEVER silently auto-match
        # ------------------------------------------------------------------
        is_ambiguous = False
        if (
            second
            and best.match_score >= (AMBIGUITY_MIN_SCORE * 100)
            and second.match_score >= (AMBIGUITY_MIN_SCORE * 100 - 5)
            and (best.score - second.score) < AMBIGUITY_SCORE_DELTA
            and best.expected.tenant_id != second.expected.tenant_id
        ):
            is_ambiguous = True
            possible_matches = [
                {
                    "tenant_id": str(best.expected.tenant_id),
                    "tenant_name": best.expected.tenant_name,
                    "unit_number": best.expected.unit_number,
                    "property_name": best.expected.property_name,
                    "invoice_id": str(best.expected.invoice_id) if best.expected.invoice_id else None,
                    "invoice_number": best.expected.invoice_number,
                    "expected_amount": best.expected.expected_amount,
                    "match_score": best.match_score,
                    "confidence_level": best.confidence_level,
                    "reasons": best.reasons,
                },
                {
                    "tenant_id": str(second.expected.tenant_id),
                    "tenant_name": second.expected.tenant_name,
                    "unit_number": second.expected.unit_number,
                    "property_name": second.expected.property_name,
                    "invoice_id": str(second.expected.invoice_id) if second.expected.invoice_id else None,
                    "invoice_number": second.expected.invoice_number,
                    "expected_amount": second.expected.expected_amount,
                    "match_score": second.match_score,
                    "confidence_level": second.confidence_level,
                    "reasons": second.reasons,
                },
            ]

        status = "UNMATCHED"
        if is_ambiguous:
            status = "POSSIBLE_MISMATCH"
            best.warnings.append(
                f"Ambiguous: also close to {second.expected.tenant_name} ({second.match_score}%) — landlord review required"
            )
        elif best.confidence_level == "AUTO_MATCH" and best.amount_kind in ("FULLY_PAID", "PARTIALLY_PAID", "OVERPAID"):
            status = "MATCHED"
        elif best.confidence_level in ("STRONG_MATCH", "REVIEW_REQUIRED"):
            status = "NEEDS_REVIEW"
        else:
            status = "UNMATCHED"

        return (
            best.expected if status != "UNMATCHED" else None,
            best.score,
            best.method,
            best.signals,
            status,
            best.amount_kind,
            best.match_summary,
            best.bank_statement_name,
            possible_matches,
            best.match_score,
            best.confidence_level,
            best.reasons,
            best.warnings,
        )

        return _pack(best, status)

    # ------------------------------------------------------------------
    # Statement processing
    # ------------------------------------------------------------------

    @staticmethod
    async def process_bank_statement(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        file_name: str,
        content_str: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        content_type: Optional[str] = None,
        property_id: Optional[uuid.UUID] = None,
        bank_account_id: Optional[uuid.UUID] = None,
        auto_confirm_high_confidence: bool = False,
    ) -> BankStatement:
        """
        AI-Powered Bank Statement Interpretation & Matching Pipeline:
        1. AI Document Understanding (Gemini API for PDF/Images or Structured Fallback)
        2. Statement-level Metadata & Raw Extraction Persistence
        3. Normalization Layer (names, descriptions, references, amounts, dates)
        4. Deterministic Matching Engine (configurable weights & confidence levels)
        5. Ambiguity Guard (prevent silent auto-match of similar candidates)
        6. Persist suggestions without auto-marking invoices as paid.
        """
        # Determine bytes for AI extraction
        if file_bytes is None and content_str is not None:
            file_bytes = content_str.encode("utf-8")
        elif file_bytes is None:
            file_bytes = b""

        # 1. AI Document Understanding
        ai_res = await BankStatementAIService.extract_statement(
            file_bytes=file_bytes,
            file_name=file_name,
            content_type=content_type,
        )

        statement_meta = ai_res.get("statement_metadata") or {}
        extracted_txns = ai_res.get("transactions") or []

        # Determine file type
        lower_name = file_name.lower()
        file_type = "PDF" if lower_name.endswith(".pdf") else (
            "XLSX" if lower_name.endswith((".xlsx", ".xls")) else (
                "IMG" if lower_name.endswith((".png", ".jpg", ".jpeg")) else "CSV"
            )
        )

        statement = BankStatement(
            landlord_id=landlord_id,
            property_id=property_id,
            bank_account_id=bank_account_id,
            file_name=file_name,
            file_type=file_type,
            file_size=len(file_bytes),
            total_transactions_count=len(extracted_txns),
            status="PROCESSING",
            ai_provider=ai_res.get("provider"),
            ai_model=ai_res.get("model"),
            extraction_status=ai_res.get("status", "COMPLETED"),
            raw_ai_response=ai_res.get("raw_response"),
            extraction_errors=ai_res.get("errors"),
            processing_duration_ms=ai_res.get("duration_ms", 0),
            bank_name=statement_meta.get("bank_name"),
            account_name=statement_meta.get("account_name"),
            account_number_masked=statement_meta.get("account_number_masked"),
            opening_balance=statement_meta.get("opening_balance") or 0.0,
            closing_balance=statement_meta.get("closing_balance") or 0.0,
            currency=statement_meta.get("currency") or DEFAULT_CURRENCY,
        )
        session.add(statement)
        await session.flush()

        # Date window calculation
        all_dates = []
        for r in extracted_txns:
            d = BankStatementNormalizer.normalize_date(r.get("date"))
            if d:
                all_dates.append(d)

        if all_dates:
            window_start = min(all_dates)
            window_end = max(all_dates)
        else:
            window_start = window_end = date.today()

        statement.period_start = window_start
        statement.period_end = window_end

        # Query expected payments & historical corrections
        expected_payments = await TrackerService.build_expected_payments(
            session, landlord_id, property_id, window_start, window_end
        )
        c_res = await session.execute(
            select(TrackerCorrection).where(TrackerCorrection.landlord_id == landlord_id)
        )
        historical_corrections = list(c_res.scalars().all())

        logger.info(
            "AI Statement %s (%s): %d txns extracted, %d expected payments in %s -> %s",
            file_name, ai_res.get("provider"), len(extracted_txns), len(expected_payments), window_start, window_end,
        )

        matched_count = 0
        unmatched_count = 0
        duplicate_count = 0
        total_incoming = 0.0
        matched_amount = 0.0
        claimed_invoice_ids: set = set()

        for raw_txn in extracted_txns:
            txn_date = BankStatementNormalizer.normalize_date(raw_txn.get("date")) or date.today()
            amt = BankStatementNormalizer.normalize_amount(raw_txn.get("amount"))
            is_credit = (raw_txn.get("type", "credit").lower() == "credit")
            if is_credit:
                total_incoming += amt

            ref = raw_txn.get("reference")
            payer = raw_txn.get("payer_name")
            desc = raw_txn.get("description") or f"Transaction on {txn_date}"
            bal_after = BankStatementNormalizer.normalize_amount(raw_txn.get("balance_after")) if raw_txn.get("balance_after") is not None else None
            conf_val = float(raw_txn.get("confidence") or 0.85)

            # Deduplication check
            dup_res = await session.execute(
                select(BankTransaction).where(
                    BankTransaction.landlord_id == landlord_id,
                    BankTransaction.transaction_date == txn_date,
                    BankTransaction.amount == amt,
                    BankTransaction.transaction_reference == ref,
                ).limit(1)
            )
            if ref and dup_res.scalars().first():
                duplicate_count += 1
                session.add(BankTransaction(
                    statement_id=statement.id,
                    landlord_id=landlord_id,
                    transaction_reference=ref,
                    transaction_date=txn_date,
                    amount=amt,
                    currency=raw_txn.get("currency", DEFAULT_CURRENCY),
                    is_credit=is_credit,
                    payer_name=payer,
                    payer_account=raw_txn.get("account_reference"),
                    balance_after=bal_after,
                    extraction_confidence=conf_val,
                    description=desc,
                    raw_text=json.dumps(raw_txn),
                    matching_status="DUPLICATE",
                    confidence_score=0.0,
                    match_method="DUPLICATE",
                ))
                continue

            txn_obj = BankTransaction(
                statement_id=statement.id,
                landlord_id=landlord_id,
                transaction_reference=ref,
                transaction_date=txn_date,
                amount=amt,
                currency=raw_txn.get("currency", DEFAULT_CURRENCY),
                is_credit=is_credit,
                payer_name=payer,
                payer_account=raw_txn.get("account_reference"),
                balance_after=bal_after,
                extraction_confidence=conf_val,
                description=desc,
                raw_text=json.dumps(raw_txn),
                matching_status="UNMATCHED",
                confidence_score=0.0,
            )
            session.add(txn_obj)
            await session.flush()

            if not is_credit:
                unmatched_count += 1
                continue

            candidates = [
                e for e in expected_payments
                if not e.invoice_id or e.invoice_id not in claimed_invoice_ids
            ]

            (
                best, conf_score, method, signals, status, amount_kind,
                match_summary, bank_name, possible_matches, match_score,
                confidence_level, reasons, warnings
            ) = await TrackerService.match_transaction(
                session, txn_obj, landlord_id, property_id, candidates, historical_corrections
            )

            txn_obj.confidence_score = conf_score
            txn_obj.match_method = (method or "")[:60]
            if bank_name and not txn_obj.payer_name:
                txn_obj.payer_name = bank_name

            if best and status in ("MATCHED", "NEEDS_REVIEW", "POSSIBLE_MISMATCH"):
                txn_obj.matched_tenant_id = best.tenant_id
                txn_obj.matched_invoice_id = best.invoice_id
                txn_obj.matching_status = status

                if amount_kind == "PARTIALLY_PAID" and status == "MATCHED":
                    txn_obj.matching_status = "PARTIAL"

                if status == "MATCHED" or txn_obj.matching_status == "PARTIAL":
                    matched_count += 1
                    matched_amount += amt
                else:
                    unmatched_count += 1

                amount_labels = {
                    "FULLY_PAID": "Fully paid",
                    "PARTIALLY_PAID": "Partially paid",
                    "OVERPAID": "Overpaid / higher than expected",
                    "AMOUNT_REVIEW": "Different amount — needs review",
                }
                signals_payload = json.dumps({
                    "match_score": match_score,
                    "confidence_level": confidence_level,
                    "reasons": reasons,
                    "warnings": warnings,
                    "possible_matches": possible_matches,
                    "signals": signals,
                    "method": method,
                    "amount_kind": amount_kind,
                    "amount_status": amount_labels.get(amount_kind, amount_kind),
                    "match_summary": match_summary,
                    "bank_statement_name": bank_name or txn_obj.payer_name,
                    "expected": {
                        "tenant_name": best.tenant_name,
                        "property_name": best.property_name,
                        "unit_number": best.unit_number,
                        "expected_amount": best.expected_amount,
                        "balance_due": best.balance_due,
                        "due_date": str(best.due_date),
                        "invoice_number": best.invoice_number,
                        "source": best.source,
                    },
                })

                if not best.invoice_id:
                    if status == "MATCHED":
                        matched_count = max(0, matched_count - 1)
                        matched_amount = max(0.0, matched_amount - amt)
                        unmatched_count += 1
                    txn_obj.matching_status = "NEEDS_REVIEW"
                    txn_obj.match_method = f"{method}+NO_INVOICE"[:60]
                else:
                    claimed_invoice_ids.add(best.invoice_id)
                    match_record = PaymentMatch(
                        transaction_id=txn_obj.id,
                        statement_id=statement.id,
                        landlord_id=landlord_id,
                        tenant_id=best.tenant_id,
                        invoice_id=best.invoice_id,
                        matched_amount=min(amt, float(best.balance_due or best.expected_amount or amt)),
                        confidence=confidence_level,
                        confidence_score=conf_score,
                        matching_signals=signals_payload,
                        review_status="PENDING_REVIEW",
                    )
                    session.add(match_record)
                    await session.flush()

                    # Legacy auto_confirm: only if explicitly requested AND AUTO_MATCH
                    if auto_confirm_high_confidence and status == "MATCHED" and confidence_level == "AUTO_MATCH":
                        try:
                            pay_amt = float(match_record.matched_amount)
                            payment, _receipt = await PaymentService.process_payment(
                                session=session,
                                invoice_id=best.invoice_id,
                                amount=pay_amt,
                                payment_method=PaymentMethod.BANK,
                                payment_channel=PaymentChannel.OFFLINE,
                                transaction_reference=txn_obj.transaction_reference
                                    or f"TXN-{uuid.uuid4().hex[:10].upper()}",
                                notes=f"Auto-reconciled via AI Tracker from Bank Statement: {file_name}",
                                auto_verify=True,
                            )
                            txn_obj.matched_payment_id = payment.id
                            txn_obj.matching_status = "MATCHED"
                            match_record.payment_id = payment.id
                            match_record.review_status = "AUTO_CONFIRMED"
                            match_record.confirmed_at = datetime.now(timezone.utc)
                        except Exception as err:
                            logger.warning(f"Could not auto-process payment for match: {err}")
                            match_record.review_status = "PENDING_REVIEW"
            else:
                txn_obj.matching_status = "UNMATCHED"
                unmatched_count += 1

        statement.matched_count = matched_count
        statement.unmatched_count = unmatched_count
        statement.duplicate_count = duplicate_count
        statement.total_incoming_amount = total_incoming
        statement.matched_amount = matched_amount
        statement.status = "COMPLETED"
        statement.notes = (
            f"AI Provider: {ai_res.get('provider')} ({ai_res.get('model')}). "
            f"Extracted {len(extracted_txns)} transactions in {ai_res.get('duration_ms', 0)}ms. "
            f"Expected payments evaluated: {len(expected_payments)}."
        )

        await session.commit()
        await session.refresh(statement)
        return statement

    # ------------------------------------------------------------------
    # Approve / manual match
    # ------------------------------------------------------------------

    @staticmethod
    async def _apply_confirmed_payment(
        session: AsyncSession,
        txn: BankTransaction,
        invoice: Invoice,
        landlord_id: uuid.UUID,
        notes: Optional[str],
        review_status: str,
        matching_signals: Optional[str] = None,
    ) -> PaymentMatch:
        # Cap at balance — overpayments apply only the outstanding amount
        pay_amount = min(float(txn.amount), float(invoice.balance_due or invoice.total_amount or 0))
        if pay_amount <= 0:
            raise ValueError("Invoice has no outstanding balance to apply this payment against.")

        # Avoid double-posting if already confirmed with a payment
        existing_match = (
            await session.execute(select(PaymentMatch).where(PaymentMatch.transaction_id == txn.id))
        ).scalar_one_or_none()
        if existing_match and existing_match.payment_id and existing_match.review_status in (
            "AUTO_CONFIRMED", "CONFIRMED_MANUALLY"
        ):
            # Reassignment: only allowed if switching invoice before/without payment,
            # or if explicitly re-matching — block silent double pay
            raise ValueError(
                "This transaction was already confirmed as a payment. "
                "Reverse the payment before reassigning."
            )

        payment, _receipt = await PaymentService.process_payment(
            session=session,
            invoice_id=invoice.id,
            amount=pay_amount,
            payment_method=PaymentMethod.BANK,
            payment_channel=PaymentChannel.OFFLINE,
            transaction_reference=txn.transaction_reference or f"TXN-{uuid.uuid4().hex[:10].upper()}",
            notes=notes or f"Matched via Tracker: {txn.description}",
            auto_verify=True,
        )

        was_unmatched = txn.matching_status in ("UNMATCHED", "NEEDS_REVIEW", "POSSIBLE_MISMATCH", "REJECTED")
        txn.matching_status = "PARTIAL" if pay_amount + 0.01 < float(txn.amount) else "MATCHED"
        if float(txn.amount) + 0.01 < float(invoice.balance_due or 0) + pay_amount:
            # Applied partial against invoice
            if pay_amount + 0.01 < float(invoice.total_amount or pay_amount):
                txn.matching_status = "PARTIAL"
        txn.matched_tenant_id = invoice.tenant_id
        txn.matched_invoice_id = invoice.id
        txn.matched_payment_id = payment.id
        txn.confidence_score = 1.0 if review_status == "CONFIRMED_MANUALLY" else max(txn.confidence_score or 0, 0.85)
        txn.match_method = txn.match_method or "APPROVED_MATCH"

        if not existing_match:
            match_obj = PaymentMatch(
                transaction_id=txn.id,
                statement_id=txn.statement_id,
                landlord_id=landlord_id,
                tenant_id=invoice.tenant_id,
                invoice_id=invoice.id,
                payment_id=payment.id,
                matched_amount=pay_amount,
                confidence="HIGH",
                confidence_score=txn.confidence_score,
                matching_signals=matching_signals or "Landlord approved match",
                review_status=review_status,
                confirmed_at=datetime.now(timezone.utc),
                notes=notes,
            )
            session.add(match_obj)
        else:
            match_obj = existing_match
            match_obj.tenant_id = invoice.tenant_id
            match_obj.invoice_id = invoice.id
            match_obj.payment_id = payment.id
            match_obj.matched_amount = pay_amount
            match_obj.confidence = "HIGH"
            match_obj.confidence_score = txn.confidence_score
            match_obj.review_status = review_status
            match_obj.confirmed_at = datetime.now(timezone.utc)
            match_obj.notes = notes
            if matching_signals:
                match_obj.matching_signals = matching_signals

        stmt = (
            await session.execute(select(BankStatement).where(BankStatement.id == txn.statement_id))
        ).scalar_one_or_none()
        if stmt and was_unmatched:
            stmt.matched_count = int(stmt.matched_count or 0) + 1
            if int(stmt.unmatched_count or 0) > 0:
                stmt.unmatched_count = int(stmt.unmatched_count) - 1
            stmt.matched_amount = float(stmt.matched_amount or 0) + pay_amount

        # Record feedback / learning from correction
        try:
            norm_desc = BankStatementNormalizer.normalize_description(txn.description)
            norm_payer = BankStatementNormalizer.normalize_name(txn.payer_name)
            correction = TrackerCorrection(
                landlord_id=landlord_id,
                payer_name_pattern=norm_payer if norm_payer else None,
                description_pattern=norm_desc[:250] if norm_desc else None,
                matched_tenant_id=invoice.tenant_id,
                matched_invoice_id=invoice.id,
                action="CONFIRMED",
                notes=notes or "Confirmed payment match",
            )
            session.add(correction)
        except Exception as corr_err:
            logger.warning(f"Could not record correction learning: {corr_err}")

        await session.commit()
        await session.refresh(match_obj)
        return match_obj

    @staticmethod
    async def approve_suggested_match(
        session: AsyncSession,
        transaction_id: uuid.UUID,
        landlord_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> PaymentMatch:
        """Approve the engine's suggested tenant/invoice match and persist the payment."""
        txn = (
            await session.execute(
                select(BankTransaction).where(
                    BankTransaction.id == transaction_id,
                    BankTransaction.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not txn:
            raise ValueError("Transaction not found")
        if not txn.matched_invoice_id:
            raise ValueError("No suggested invoice on this transaction. Use manual match to pick one.")
        if txn.matching_status == "DUPLICATE":
            raise ValueError("Duplicate transactions cannot be approved.")
        if txn.matched_payment_id:
            raise ValueError("This transaction is already linked to a confirmed payment.")

        invoice = (
            await session.execute(
                select(Invoice).where(
                    Invoice.id == txn.matched_invoice_id,
                    Invoice.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not invoice:
            raise ValueError("Suggested invoice not found")

        match_row = (
            await session.execute(select(PaymentMatch).where(PaymentMatch.transaction_id == txn.id))
        ).scalar_one_or_none()
        signals = match_row.matching_signals if match_row else "Approved suggested match"

        return await TrackerService._apply_confirmed_payment(
            session,
            txn,
            invoice,
            landlord_id,
            notes=notes or "Approved suggested match",
            review_status="CONFIRMED_MANUALLY",
            matching_signals=signals,
        )

    @staticmethod
    async def confirm_manual_match(
        session: AsyncSession,
        transaction_id: uuid.UUID,
        invoice_id: uuid.UUID,
        landlord_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> PaymentMatch:
        """Manually link (or reassign) a transaction to an invoice and post payment."""
        txn = (
            await session.execute(
                select(BankTransaction).where(
                    BankTransaction.id == transaction_id,
                    BankTransaction.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not txn:
            raise ValueError("Transaction not found")
        if txn.matched_payment_id:
            raise ValueError(
                "This transaction already has a confirmed payment. "
                "Cannot reassign without reversing the payment first."
            )

        invoice = (
            await session.execute(
                select(Invoice).where(Invoice.id == invoice_id, Invoice.landlord_id == landlord_id)
            )
        ).scalar_one_or_none()
        if not invoice:
            raise ValueError("Invoice not found")

        txn.match_method = "MANUAL_MATCH"
        return await TrackerService._apply_confirmed_payment(
            session,
            txn,
            invoice,
            landlord_id,
            notes=notes,
            review_status="CONFIRMED_MANUALLY",
            matching_signals="Manual landlord confirmation",
        )

    # ------------------------------------------------------------------
    # Analysis report
    # ------------------------------------------------------------------

    @staticmethod
    async def get_statement_analysis(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        statement_id: Optional[uuid.UUID] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Build Matching Analysis Report rows for a statement (or recent open txns)."""
        q = select(BankTransaction).where(BankTransaction.landlord_id == landlord_id)
        if statement_id:
            q = q.where(BankTransaction.statement_id == statement_id)
        q = q.order_by(desc(BankTransaction.transaction_date), desc(BankTransaction.created_at)).limit(limit)
        txns = list((await session.execute(q)).scalars().all())
        if not txns:
            return []

        match_rows = list(
            (await session.execute(
                select(PaymentMatch).where(
                    PaymentMatch.landlord_id == landlord_id,
                    PaymentMatch.transaction_id.in_([t.id for t in txns]),
                )
            )).scalars().all()
        )
        match_by_txn = {m.transaction_id: m for m in match_rows}

        tenant_ids = {t.matched_tenant_id for t in txns if t.matched_tenant_id}
        tenants: Dict[uuid.UUID, TenantProfile] = {}
        if tenant_ids:
            tres = await session.execute(
                select(TenantProfile)
                .options(selectinload(TenantProfile.user))
                .where(TenantProfile.id.in_(list(tenant_ids)))
            )
            tenants = {t.id: t for t in tres.scalars().all()}

        invoice_ids = {t.matched_invoice_id for t in txns if t.matched_invoice_id}
        invoices: Dict[uuid.UUID, Invoice] = {}
        if invoice_ids:
            ires = await session.execute(select(Invoice).where(Invoice.id.in_(list(invoice_ids))))
            invoices = {i.id: i for i in ires.scalars().all()}

        unit_ids = {inv.unit_id for inv in invoices.values() if inv.unit_id}
        units: Dict[uuid.UUID, Unit] = {}
        if unit_ids:
            ures = await session.execute(select(Unit).where(Unit.id.in_(list(unit_ids))))
            units = {u.id: u for u in ures.scalars().all()}

        prop_ids = {inv.property_id for inv in invoices.values() if inv.property_id}
        props: Dict[uuid.UUID, Property] = {}
        if prop_ids:
            pres = await session.execute(select(Property).where(Property.id.in_(list(prop_ids))))
            props = {p.id: p for p in pres.scalars().all()}

        rows: List[Dict[str, Any]] = []
        for t in txns:
            if not t.is_credit:
                continue
            m = match_by_txn.get(t.id)
            inv = invoices.get(t.matched_invoice_id) if t.matched_invoice_id else None
            tenant = tenants.get(t.matched_tenant_id) if t.matched_tenant_id else None
            tenant_name = None
            if tenant:
                tenant_name, _, _ = TrackerService._tenant_identity(tenant)

            signals: List[str] = []
            expected_amount = None
            property_name = None
            unit_number = None
            invoice_number = None
            match_summary = None
            amount_status = None
            amount_kind = None
            bank_statement_name = t.payer_name
            reasons: List[str] = []
            warnings: List[str] = []
            possible_matches: List[Dict[str, Any]] = []
            conf = float(t.confidence_score or 0.0)
            match_score = int(round(conf * 100))
            confidence_level = "AUTO_MATCH" if match_score >= 95 else (
                "STRONG_MATCH" if match_score >= 80 else (
                    "REVIEW_REQUIRED" if match_score >= 60 else "UNMATCHED"
                )
            )

            if m and m.matching_signals:
                try:
                    parsed = json.loads(m.matching_signals)
                    signals = parsed.get("signals") or []
                    reasons = parsed.get("reasons") or []
                    warnings = parsed.get("warnings") or []
                    possible_matches = parsed.get("possible_matches") or []
                    if parsed.get("match_score") is not None:
                        match_score = parsed.get("match_score")
                    if parsed.get("confidence_level"):
                        confidence_level = parsed.get("confidence_level")
                    match_summary = parsed.get("match_summary")
                    amount_status = parsed.get("amount_status")
                    amount_kind = parsed.get("amount_kind")
                    bank_statement_name = parsed.get("bank_statement_name") or t.payer_name
                    exp = parsed.get("expected") or {}
                    expected_amount = exp.get("expected_amount") or exp.get("balance_due")
                    property_name = exp.get("property_name")
                    unit_number = exp.get("unit_number")
                    invoice_number = exp.get("invoice_number")
                    if not tenant_name:
                        tenant_name = exp.get("tenant_name")
                except Exception:
                    signals = [s.strip() for s in str(m.matching_signals).split(";") if s.strip()]

            if inv:
                invoice_number = inv.invoice_number
                expected_amount = float(inv.balance_due if inv.balance_due is not None else inv.total_amount)
                u = units.get(inv.unit_id)
                p = props.get(inv.property_id)
                if u:
                    unit_number = u.unit_number
                if p:
                    property_name = p.name

            # Derive amount status if missing (e.g. older rows)
            if not amount_status and expected_amount is not None:
                kind, label = TrackerService._amount_status(
                    float(t.amount), float(expected_amount), float(expected_amount)
                )
                amount_kind = amount_kind or kind
                amount_status = label

            if not match_summary and tenant_name and (bank_statement_name or t.payer_name):
                appearance = next(
                    (s for s in signals if "appears to match" in s.lower() or "Exact name" in s),
                    "",
                )
                match_summary = TrackerService._compose_match_summary(
                    bank_statement_name or t.payer_name,
                    tenant_name,
                    appearance,
                    signals,
                    amount_status or "",
                )

            conf = float(t.confidence_score or 0)
            conf_label = "HIGH" if conf >= 0.85 else "MEDIUM" if conf >= 0.60 else "LOW" if conf > 0 else "NONE"

            # Display status for the report
            if t.matching_status == "DUPLICATE":
                display_status = "DUPLICATE"
            elif t.matched_payment_id or (m and m.review_status in ("AUTO_CONFIRMED", "CONFIRMED_MANUALLY")):
                display_status = "MATCHED"
            elif t.matching_status == "POSSIBLE_MISMATCH":
                display_status = "POSSIBLE_MISMATCH"
            elif t.matching_status in ("MATCHED", "PARTIAL") and not t.matched_payment_id:
                # Suggested match awaiting approval
                display_status = "NEEDS_REVIEW" if confidence_level != "AUTO_MATCH" else "MATCHED"
            elif t.matching_status == "NEEDS_REVIEW":
                display_status = "NEEDS_REVIEW"
            elif t.matching_status == "REJECTED":
                display_status = "UNMATCHED"
            else:
                display_status = "UNMATCHED"

            # Pending approval badge for suggestions
            review_status = m.review_status if m else None
            pending_approval = bool(
                t.matched_invoice_id
                and not t.matched_payment_id
                and t.matching_status in ("MATCHED", "PARTIAL", "NEEDS_REVIEW", "POSSIBLE_MISMATCH")
            )

            rows.append({
                "id": str(t.id),
                "statement_id": str(t.statement_id),
                "transaction_reference": t.transaction_reference,
                "transaction_date": str(t.transaction_date),
                "amount": float(t.amount),
                "currency": t.currency or "RWF",
                "payer_name": t.payer_name,
                "bank_statement_name": bank_statement_name or t.payer_name,
                "description": t.description,
                "bank_reference_id": t.transaction_reference,
                "matched_tenant_id": str(t.matched_tenant_id) if t.matched_tenant_id else None,
                "matched_tenant_name": tenant_name,
                "property_name": property_name,
                "unit_number": unit_number,
                "suggested_invoice_id": str(t.matched_invoice_id) if t.matched_invoice_id else None,
                "invoice_number": invoice_number,
                "expected_amount": expected_amount,
                "amount_kind": amount_kind,
                "amount_status": amount_status,
                "payment_amount_status": amount_status,
                "match_summary": match_summary,
                "confidence_score": conf,
                "confidence_label": conf_label,
                "match_score": match_score,
                "confidence_level": confidence_level,
                "reasons": reasons,
                "warnings": warnings,
                "possible_matches": possible_matches,
                "match_method": t.match_method,
                "matching_signals": signals,
                "matching_status": t.matching_status,
                "display_status": display_status,
                "review_status": review_status,
                "pending_approval": pending_approval,
                "payment_id": str(t.matched_payment_id) if t.matched_payment_id else None,
            })

        return rows

    @staticmethod
    async def get_statement_transactions(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        statement_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """List all extracted transactions for a bank statement with normalized details."""
        stmt = (
            await session.execute(
                select(BankStatement).where(
                    BankStatement.id == statement_id,
                    BankStatement.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not stmt:
            raise ValueError("Statement not found")

        txns = (
            await session.execute(
                select(BankTransaction)
                .where(BankTransaction.statement_id == statement_id, BankTransaction.landlord_id == landlord_id)
                .order_by(desc(BankTransaction.transaction_date), desc(BankTransaction.created_at))
            )
        ).scalars().all()

        return [
            {
                "id": str(t.id),
                "statement_id": str(t.statement_id),
                "transaction_date": str(t.transaction_date),
                "amount": float(t.amount),
                "currency": t.currency,
                "is_credit": t.is_credit,
                "type": "credit" if t.is_credit else "debit",
                "payer_name": t.payer_name,
                "payer_account": t.payer_account,
                "description": t.description,
                "transaction_reference": t.transaction_reference,
                "balance_after": float(t.balance_after) if t.balance_after is not None else None,
                "extraction_confidence": float(t.extraction_confidence or 1.0),
                "matching_status": t.matching_status,
                "confidence_score": float(t.confidence_score or 0.0),
                "match_method": t.match_method,
                "matched_tenant_id": str(t.matched_tenant_id) if t.matched_tenant_id else None,
                "matched_invoice_id": str(t.matched_invoice_id) if t.matched_invoice_id else None,
                "matched_payment_id": str(t.matched_payment_id) if t.matched_payment_id else None,
            }
            for t in txns
        ]

    @staticmethod
    async def get_statement_matches(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        statement_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Categorize matches for human review: auto_matched, needs_review, unmatched, duplicates, possible_matches."""
        analysis_rows = await TrackerService.get_statement_analysis(
            session=session, landlord_id=landlord_id, statement_id=statement_id
        )

        auto_matched: List[Dict[str, Any]] = []
        needs_review: List[Dict[str, Any]] = []
        unmatched: List[Dict[str, Any]] = []
        duplicates: List[Dict[str, Any]] = []
        possible_matches: List[Dict[str, Any]] = []

        for row in analysis_rows:
            st = row.get("matching_status")
            conf_level = row.get("confidence_level", "UNMATCHED")

            if st == "DUPLICATE":
                duplicates.append(row)
            elif st == "POSSIBLE_MISMATCH":
                possible_matches.append(row)
                needs_review.append(row)
            elif st in ("MATCHED", "PARTIAL") and conf_level == "AUTO_MATCH":
                auto_matched.append(row)
            elif st in ("NEEDS_REVIEW", "MATCHED", "PARTIAL"):
                needs_review.append(row)
            else:
                unmatched.append(row)

        stmt = (
            await session.execute(
                select(BankStatement).where(BankStatement.id == statement_id, BankStatement.landlord_id == landlord_id)
            )
        ).scalar_one_or_none()

        return {
            "statement_id": str(statement_id),
            "file_name": stmt.file_name if stmt else "",
            "ai_provider": stmt.ai_provider if stmt else None,
            "ai_model": stmt.ai_model if stmt else None,
            "extraction_status": stmt.extraction_status if stmt else None,
            "total_transactions": stmt.total_transactions_count if stmt else len(analysis_rows),
            "counts": {
                "auto_matched": len(auto_matched),
                "needs_review": len(needs_review),
                "unmatched": len(unmatched),
                "duplicates": len(duplicates),
                "possible_matches": len(possible_matches),
            },
            "auto_matched": auto_matched,
            "needs_review": needs_review,
            "unmatched": unmatched,
            "duplicates": duplicates,
            "possible_matches": possible_matches,
        }

    @staticmethod
    async def confirm_match_by_id(
        session: AsyncSession,
        match_id: uuid.UUID,
        landlord_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> PaymentMatch:
        """Confirm a match record by match ID, posting payment and updating invoice."""
        match_row = (
            await session.execute(
                select(PaymentMatch).where(
                    PaymentMatch.id == match_id,
                    PaymentMatch.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not match_row:
            raise ValueError("Payment match record not found")

        return await TrackerService.approve_suggested_match(
            session=session,
            transaction_id=match_row.transaction_id,
            landlord_id=landlord_id,
            notes=notes,
        )

    @staticmethod
    async def reject_match_by_id(
        session: AsyncSession,
        match_id: uuid.UUID,
        landlord_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Reject a match record by match ID, leaving transaction unmatched and recording feedback."""
        match_row = (
            await session.execute(
                select(PaymentMatch).where(
                    PaymentMatch.id == match_id,
                    PaymentMatch.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not match_row:
            raise ValueError("Payment match record not found")

        txn = (
            await session.execute(
                select(BankTransaction).where(
                    BankTransaction.id == match_row.transaction_id,
                    BankTransaction.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not txn:
            raise ValueError("Transaction not found")
        if txn.matched_payment_id:
            raise ValueError("Cannot reject a match that is already confirmed with a payment.")

        txn.matching_status = "UNMATCHED"
        txn.matched_tenant_id = None
        txn.matched_invoice_id = None
        match_row.review_status = "REJECTED"
        match_row.rejection_reason = reason or "Rejected by landlord"

        # Record rejection correction
        try:
            norm_desc = BankStatementNormalizer.normalize_description(txn.description)
            norm_payer = BankStatementNormalizer.normalize_name(txn.payer_name)
            correction = TrackerCorrection(
                landlord_id=landlord_id,
                payer_name_pattern=norm_payer if norm_payer else None,
                description_pattern=norm_desc[:250] if norm_desc else None,
                matched_tenant_id=match_row.tenant_id,
                matched_invoice_id=match_row.invoice_id,
                action="REJECTED",
                notes=reason or "Rejected by landlord",
            )
            session.add(correction)
        except Exception as corr_err:
            logger.warning(f"Could not record rejection learning: {corr_err}")

        await session.commit()
        return {"status": "success", "message": "Match rejected"}

    @staticmethod
    async def reject_suggested_match(
        session: AsyncSession,
        transaction_id: uuid.UUID,
        landlord_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dismiss a suggested match for a transaction and record rejection feedback."""
        txn = (
            await session.execute(
                select(BankTransaction).where(
                    BankTransaction.id == transaction_id,
                    BankTransaction.landlord_id == landlord_id,
                )
            )
        ).scalar_one_or_none()
        if not txn:
            raise ValueError("Transaction not found")
        if txn.matched_payment_id:
            raise ValueError("Cannot dismiss a transaction with an already-confirmed payment.")

        old_tenant_id = txn.matched_tenant_id
        old_invoice_id = txn.matched_invoice_id

        txn.matching_status = "UNMATCHED"
        txn.matched_tenant_id = None
        txn.matched_invoice_id = None

        match_res = await session.execute(select(PaymentMatch).where(PaymentMatch.transaction_id == txn.id))
        match_obj = match_res.scalar_one_or_none()
        if match_obj and not match_obj.payment_id:
            match_obj.review_status = "REJECTED"
            match_obj.rejection_reason = reason or "Rejected by landlord"

        # Record rejection learning
        try:
            norm_desc = BankStatementNormalizer.normalize_description(txn.description)
            norm_payer = BankStatementNormalizer.normalize_name(txn.payer_name)
            correction = TrackerCorrection(
                landlord_id=landlord_id,
                payer_name_pattern=norm_payer if norm_payer else None,
                description_pattern=norm_desc[:250] if norm_desc else None,
                matched_tenant_id=old_tenant_id,
                matched_invoice_id=old_invoice_id,
                action="REJECTED",
                notes=reason or "Rejected by landlord",
            )
            session.add(correction)
        except Exception as corr_err:
            logger.warning(f"Could not record rejection learning: {corr_err}")

        await session.commit()
        return {"status": "success", "message": "Transaction left unmatched for later review"}

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------

    @staticmethod
    async def get_tracker_data(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None,
        period_type: str = "THIS_MONTH",
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        today = date.today()

        if period_type == "TODAY":
            p_start = p_end = today
        elif period_type == "THIS_WEEK":
            p_start = today - timedelta(days=today.weekday())
            p_end = p_start + timedelta(days=6)
        elif period_type == "CUSTOM" and start_date_str and end_date_str:
            p_start = TrackerService.parse_date(start_date_str) or date(today.year, today.month, 1)
            p_end = TrackerService.parse_date(end_date_str) or today
        else:
            p_start = date(today.year, today.month, 1)
            next_month = date(
                today.year + (1 if today.month == 12 else 0),
                1 if today.month == 12 else today.month + 1,
                1,
            )
            p_end = next_month - timedelta(days=1)

        empty = {
            "period_start": str(p_start),
            "period_end": str(p_end),
            "period_type": period_type,
            "summary": {
                "total_expected_amount": 0.0,
                "total_received_amount": 0.0,
                "total_outstanding_amount": 0.0,
                "total_expected_tenants": 0,
                "total_paid_tenants": 0,
                "total_unpaid_tenants": 0,
                "total_partial_tenants": 0,
                "collection_rate_percent": 0.0,
            },
            "today_tracking": {
                "date": str(today),
                "received_today_amount": 0.0,
                "received_today_count": 0,
                "expected_today_amount": 0.0,
                "expected_today_count": 0,
                "paid_today_list": [],
                "expected_today_list": [],
            },
            "tenant_tracking_list": [],
            "needs_review_transactions": [],
            "matching_analysis_report": [],
            "recent_statements": [],
            "payment_timeline": [],
        }

        prop_query = select(Property).where(Property.landlord_id == landlord_id)
        if property_id:
            prop_query = prop_query.where(Property.id == property_id)
        props = list((await session.execute(prop_query)).scalars().all())
        prop_ids = [p.id for p in props]
        if not prop_ids:
            return empty

        lease_query = (
            select(Lease, Tenancy, TenantProfile, Unit, Property)
            .join(Tenancy, Tenancy.id == Lease.tenancy_id)
            .join(TenantProfile, TenantProfile.id == Tenancy.tenant_id)
            .join(Unit, Unit.id == Lease.unit_id)
            .join(Property, Property.id == Lease.property_id)
            .options(selectinload(TenantProfile.user))
            .where(
                Lease.property_id.in_(prop_ids),
                Lease.status.in_(ACTIVE_LEASE_STATUSES),
            )
        )
        lease_rows = (await session.execute(lease_query)).all()

        inv_query = (
            select(Invoice)
            .where(
                Invoice.property_id.in_(prop_ids),
                or_(
                    and_(
                        Invoice.billing_period_start >= p_start,
                        Invoice.billing_period_start <= p_end,
                    ),
                    and_(Invoice.due_date >= p_start, Invoice.due_date <= p_end),
                ),
            )
        )
        invoices = list((await session.execute(inv_query)).scalars().all())

        pay_query = (
            select(Payment)
            .where(
                Payment.property_id.in_(prop_ids),
                Payment.paid_at >= datetime(p_start.year, p_start.month, p_start.day, tzinfo=timezone.utc),
                Payment.paid_at <= datetime(p_end.year, p_end.month, p_end.day, 23, 59, 59, tzinfo=timezone.utc),
                Payment.status == PaymentStatus.COMPLETED,
            )
        )
        payments = list((await session.execute(pay_query)).scalars().all())

        statements = list(
            (await session.execute(
                select(BankStatement)
                .where(BankStatement.landlord_id == landlord_id)
                .order_by(desc(BankStatement.created_at))
                .limit(10)
            )).scalars().all()
        )

        latest_statement_id = statements[0].id if statements else None
        matching_analysis_report = await TrackerService.get_statement_analysis(
            session, landlord_id, statement_id=latest_statement_id, limit=80
        )

        # Needs-review queue = analysis rows still pending action
        review_txns_payload = [
            {
                "id": r["id"],
                "statement_id": r["statement_id"],
                "transaction_reference": r["transaction_reference"],
                "transaction_date": r["transaction_date"],
                "amount": r["amount"],
                "payer_name": r["payer_name"],
                "bank_statement_name": r.get("bank_statement_name") or r.get("payer_name"),
                "description": r["description"],
                "matching_status": r["matching_status"],
                "confidence_score": r["confidence_score"],
                "suggested_tenant_id": r["matched_tenant_id"],
                "suggested_invoice_id": r["suggested_invoice_id"],
                "match_method": r["match_method"],
                "matched_tenant_name": r.get("matched_tenant_name"),
                "property_name": r.get("property_name"),
                "unit_number": r.get("unit_number"),
                "expected_amount": r.get("expected_amount"),
                "amount_kind": r.get("amount_kind"),
                "amount_status": r.get("amount_status"),
                "payment_amount_status": r.get("payment_amount_status"),
                "match_summary": r.get("match_summary"),
                "confidence_label": r.get("confidence_label"),
                "matching_signals": r.get("matching_signals") or [],
                "display_status": r.get("display_status"),
                "pending_approval": r.get("pending_approval"),
                "invoice_number": r.get("invoice_number"),
            }
            for r in matching_analysis_report
            if r.get("pending_approval") or r.get("display_status") in (
                "NEEDS_REVIEW", "UNMATCHED", "POSSIBLE_MISMATCH"
            )
        ]

        tenant_rows: List[Dict[str, Any]] = []
        total_expected_sum = 0.0
        total_received_sum = 0.0
        paid_tenants_cnt = unpaid_tenants_cnt = partial_tenants_cnt = 0
        paid_today_list: List[Dict[str, Any]] = []
        expected_today_list: List[Dict[str, Any]] = []
        received_today_amt = expected_today_amt = 0.0

        for lease, tenancy, tenant, unit, prop in lease_rows:
            name, email, phone = TrackerService._tenant_identity(tenant)
            rent_amount = float(lease.monthly_rent or unit.monthly_rent or 0)

            lease_invs = [i for i in invoices if i.lease_id == lease.id or i.tenant_id == tenant.id]
            if not lease_invs:
                # Strictly enforce real invoices for the period
                continue
                
            invoice = lease_invs[0]

            due_day = int(lease.payment_due_day or 5)
            try:
                due_date = date(p_start.year, p_start.month, min(due_day, 28))
            except Exception:
                due_date = p_start + timedelta(days=5)

            expected_amt = float(invoice.total_amount)
            paid_amt = float(invoice.amount_paid or 0)
            bal_due = float(invoice.balance_due if invoice.balance_due is not None else expected_amt - paid_amt)
            inv_due_date = invoice.due_date or due_date

            total_expected_sum += expected_amt
            total_received_sum += paid_amt

            t_pays = [p for p in payments if p.lease_id == lease.id or p.tenant_id == tenant.id]
            last_payment = (
                sorted(t_pays, key=lambda p: p.paid_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[0]
                if t_pays else None
            )
            paid_date = last_payment.paid_at.date() if last_payment and last_payment.paid_at else None

            if paid_amt >= expected_amt - 1.0:
                paid_tenants_cnt += 1
                status = "PAID_LATE" if paid_date and inv_due_date and paid_date > inv_due_date else "PAID"
            elif paid_amt > 0:
                partial_tenants_cnt += 1
                status = "PARTIAL"
            else:
                if inv_due_date and today > inv_due_date:
                    unpaid_tenants_cnt += 1
                    status = "NOT_PAID"
                else:
                    status = "UPCOMING"

            if inv_due_date == today:
                expected_today_amt += expected_amt
                expected_today_list.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": name,
                    "property_name": prop.name,
                    "unit_number": unit.unit_number,
                    "expected_amount": expected_amt,
                    "status": status,
                    "paid_amount": paid_amt,
                })

            if paid_date == today and last_payment:
                received_today_amt += float(last_payment.amount)
                channel = (
                    last_payment.payment_method.value
                    if last_payment.payment_method else "BANK"
                )
                paid_today_list.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": name,
                    "property_name": prop.name,
                    "unit_number": unit.unit_number,
                    "paid_amount": float(last_payment.amount),
                    "paid_time": last_payment.paid_at.strftime("%H:%M") if last_payment.paid_at else "Not available",
                    "payment_reference": last_payment.payment_reference,
                    "channel": channel,
                })

            tenant_rows.append({
                "tenant_id": str(tenant.id),
                "tenant_name": name,
                "tenant_phone": phone,
                "tenant_email": email,
                "property_id": str(prop.id),
                "property_name": prop.name,
                "unit_id": str(unit.id),
                "unit_number": unit.unit_number,
                "lease_id": str(lease.id),
                "invoice_id": str(invoice.id) if invoice else None,
                "invoice_number": invoice.invoice_number if invoice else None,
                "expected_amount": expected_amt,
                "paid_amount": paid_amt,
                "balance_due": bal_due,
                "due_date": str(inv_due_date),
                "paid_date": str(paid_date) if paid_date else None,
                "status": status,
                "match_confidence": (
                    "HIGH" if status in ("PAID", "PAID_LATE")
                    else "MEDIUM" if status == "PARTIAL"
                    else "NONE"
                ),
                "payment_reference": last_payment.payment_reference if last_payment else None,
                "last_transaction_desc": last_payment.notes if last_payment else None,
            })

        collection_rate = (
            round((total_received_sum / total_expected_sum * 100), 1) if total_expected_sum > 0 else 0.0
        )
        total_outstanding = max(0.0, total_expected_sum - total_received_sum)

        timeline = []
        cur_day = p_start
        while cur_day <= p_end:
            day_expected = sum(r["expected_amount"] for r in tenant_rows if r["due_date"] == str(cur_day))
            day_paid = sum(r["paid_amount"] for r in tenant_rows if r["paid_date"] == str(cur_day))
            day_tenants = [
                r for r in tenant_rows
                if r["due_date"] == str(cur_day) or r["paid_date"] == str(cur_day)
            ]
            timeline.append({
                "date": str(cur_day),
                "day_number": cur_day.day,
                "is_today": cur_day == today,
                "expected_amount": day_expected,
                "paid_amount": day_paid,
                "tenants_count": len(day_tenants),
                "has_overdue": any(
                    t["status"] == "NOT_PAID" and cur_day < today for t in day_tenants
                ),
            })
            cur_day += timedelta(days=1)

        return {
            "period_start": str(p_start),
            "period_end": str(p_end),
            "period_type": period_type,
            "summary": {
                "total_expected_amount": total_expected_sum,
                "total_received_amount": total_received_sum,
                "total_outstanding_amount": total_outstanding,
                "total_expected_tenants": len(tenant_rows),
                "total_paid_tenants": paid_tenants_cnt,
                "total_unpaid_tenants": unpaid_tenants_cnt,
                "total_partial_tenants": partial_tenants_cnt,
                "collection_rate_percent": collection_rate,
            },
            "today_tracking": {
                "date": str(today),
                "received_today_amount": received_today_amt,
                "received_today_count": len(paid_today_list),
                "expected_today_amount": expected_today_amt,
                "expected_today_count": len(expected_today_list),
                "paid_today_list": paid_today_list,
                "expected_today_list": expected_today_list,
            },
            "tenant_tracking_list": tenant_rows,
            "needs_review_transactions": review_txns_payload,
            "matching_analysis_report": matching_analysis_report,
            "recent_statements": [
                {
                    "id": str(s.id),
                    "file_name": s.file_name,
                    "file_type": s.file_type,
                    "file_size": s.file_size,
                    "uploaded_at": s.uploaded_at.isoformat() if s.uploaded_at else "",
                    "period_start": str(s.period_start) if s.period_start else None,
                    "period_end": str(s.period_end) if s.period_end else None,
                    "total_transactions_count": s.total_transactions_count,
                    "matched_count": s.matched_count,
                    "unmatched_count": s.unmatched_count,
                    "duplicate_count": s.duplicate_count,
                    "total_incoming_amount": float(s.total_incoming_amount),
                    "matched_amount": float(s.matched_amount),
                    "status": s.status,
                    "notes": s.notes,
                }
                for s in statements
            ],
            "payment_timeline": timeline,
        }
