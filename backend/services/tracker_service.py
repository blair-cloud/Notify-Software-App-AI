import csv
import io
import re
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from backend.models import (
    LandlordProfile, TenantProfile, Property, Unit, Tenancy, Lease,
    Invoice, Payment, Receipt, PaymentMethod, PaymentChannel, PaymentStatus,
    InvoiceStatus, TenancyStatus, LeaseStatus
)
from backend.models.tracker import BankAccount, BankStatement, BankTransaction, PaymentMatch
from backend.services.payment_service import PaymentService
from backend.core.logging import logger


class TrackerService:

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
        if isinstance(val, date):
            return val
        if isinstance(val, datetime):
            return val.date()
        val_str = str(val).strip()
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d-%m-%Y",
            "%d.%m.%Y",
            "%Y/%m/%d",
            "%d %b %Y",
            "%d-%b-%Y",
            "%d %B %Y",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val_str[:19], fmt).date()
            except Exception:
                continue
        # Fallback regex search for YYYY-MM-DD or DD/MM/YYYY
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
        # Common bank narration patterns:
        # "FT FRM JEAN BOSCO MUGISHA" -> "JEAN BOSCO MUGISHA"
        # "MOMO TRANSFER FROM 0788123456 CLAUDINE UWIMANA"
        # "BK TRF: ALINE MUKAMANA - RENT UNIT A1"
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
                if len(candidate) > 2 and not re.match(r'^(TRANSFER|PAYMENT|MOMO|BK|REF|DEPOSIT|BANK)$', candidate, re.IGNORECASE):
                    return candidate
        return None

    @staticmethod
    def parse_statement_content(content_str: str, file_name: str) -> List[Dict[str, Any]]:
        """Parses CSV, TSV, or structured bank export text into normalized transaction dicts."""
        transactions: List[Dict[str, Any]] = []

        # Check if CSV
        try:
            reader = csv.reader(io.StringIO(content_str))
            rows = list(reader)
            if not rows:
                return []

            # Identify header row
            header_idx = -1
            headers = []
            for i, row in enumerate(rows[:10]):
                joined = " ".join(row).lower()
                if any(kw in joined for kw in ["date", "description", "details", "narration", "credit", "amount", "balance"]):
                    header_idx = i
                    headers = [c.strip().lower() for c in row]
                    break

            if header_idx != -1:
                # Map column indices
                date_col = -1
                desc_col = -1
                amount_col = -1
                credit_col = -1
                debit_col = -1
                ref_col = -1
                payer_col = -1

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
                    if not row or all(not cell.strip() for cell in row):
                        continue
                    
                    txn_date_val = row[date_col] if date_col != -1 and date_col < len(row) else None
                    txn_date = TrackerService.parse_date(txn_date_val)
                    if not txn_date:
                        txn_date = date.today()

                    desc = row[desc_col] if desc_col != -1 and desc_col < len(row) else ""
                    if not desc and len(row) > 1:
                        desc = " ".join([c for c in row if c])

                    amount = 0.0
                    is_credit = True

                    if credit_col != -1 and credit_col < len(row) and row[credit_col].strip():
                        val = TrackerService.parse_amount(row[credit_col])
                        if val > 0:
                            amount = val
                            is_credit = True
                    elif amount_col != -1 and amount_col < len(row) and row[amount_col].strip():
                        val = TrackerService.parse_amount(row[amount_col])
                        amount = val
                        is_credit = True
                    elif debit_col != -1 and debit_col < len(row) and row[debit_col].strip():
                        # outgoing, we skip or flag is_credit=False
                        val = TrackerService.parse_amount(row[debit_col])
                        amount = val
                        is_credit = False

                    if amount <= 0:
                        continue

                    ref = row[ref_col].strip() if ref_col != -1 and ref_col < len(row) else None
                    if not ref:
                        # try extracting from description
                        ref_match = re.search(r'(?:REF|TXN|ID|INV|RCT)[:\s-]*([A-Z0-9-]{6,25})', desc, re.IGNORECASE)
                        if ref_match:
                            ref = ref_match.group(1).upper()
                        else:
                            ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"

                    payer = row[payer_col].strip() if payer_col != -1 and payer_col < len(row) else None
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
                        "raw_text": ",".join(row),
                    })
        except Exception as e:
            logger.error(f"Error parsing CSV statement: {e}")

        # Fallback for plain lines / tabular text if CSV was empty
        if not transactions:
            lines = content_str.splitlines()
            for line in lines:
                if not line.strip() or len(line.strip()) < 10:
                    continue
                # Try finding date and amount
                d = TrackerService.parse_date(line)
                amt_match = re.findall(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)', line)
                if amt_match:
                    # pick largest number in line as candidate amount
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

    @staticmethod
    async def match_transaction(
        session: AsyncSession,
        transaction: BankTransaction,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None
    ) -> Tuple[Optional[TenantProfile], Optional[Invoice], float, str, List[str]]:
        """
        Runs multi-signal deterministic and fuzzy matching logic against Notify database.
        Returns (tenant, invoice, confidence_score, match_method, signals)
        """
        signals: List[str] = []
        score: float = 0.0
        method: str = "UNMATCHED"

        # Load all active tenancies & invoices for this landlord
        inv_query = (
            select(Invoice)
            .where(
                Invoice.landlord_id == landlord_id,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE, InvoiceStatus.UNPAID])
            )
        )
        if property_id:
            inv_query = inv_query.where(Invoice.property_id == property_id)

        inv_res = await session.execute(inv_query)
        invoices = list(inv_res.scalars().all())

        # Load active tenants for landlord
        ten_query = (
            select(TenantProfile)
            .join(Tenancy, Tenancy.tenant_id == TenantProfile.id)
            .join(Property, Property.id == Tenancy.property_id)
            .where(Property.landlord_id == landlord_id)
        )
        ten_res = await session.execute(ten_query)
        tenants = list(ten_res.scalars().all())

        txn_ref = (transaction.transaction_reference or "").upper()
        txn_desc = (transaction.description or "").upper()
        txn_payer = (transaction.payer_name or "").upper()
        txn_amt = float(transaction.amount)
        txn_date = transaction.transaction_date

        best_invoice: Optional[Invoice] = None
        best_tenant: Optional[TenantProfile] = None

        # 1. Check Invoice Reference in description or transaction reference (e.g. NOTIFY-INV-2026-0001 or INV-0001)
        for inv in invoices:
            inv_num = (inv.invoice_number or "").upper()
            if inv_num and (inv_num in txn_desc or inv_num in txn_ref):
                signals.append(f"Exact invoice number match: {inv.invoice_number}")
                score = 0.98
                method = "INVOICE_REF_MATCH"
                best_invoice = inv
                # Find matching tenant
                for t in tenants:
                    if t.id == inv.tenant_id:
                        best_tenant = t
                        break
                break

        # 2. If no exact invoice reference, match by Tenant Name + Amount
        if not best_invoice:
            for t in tenants:
                first_name = (t.first_name or "").upper()
                last_name = (t.last_name or "").upper()
                full_name = f"{first_name} {last_name}".strip()
                reverse_name = f"{last_name} {first_name}".strip()

                name_matched = False
                matched_name_signal = ""

                if full_name and (full_name in txn_desc or full_name in txn_payer):
                    name_matched = True
                    matched_name_signal = f"Full name match: {full_name}"
                elif reverse_name and (reverse_name in txn_desc or reverse_name in txn_payer):
                    name_matched = True
                    matched_name_signal = f"Name match: {reverse_name}"
                elif (last_name and len(last_name) > 3 and (last_name in txn_desc or last_name in txn_payer)) and \
                     (first_name and len(first_name) > 3 and (first_name in txn_desc or first_name in txn_payer)):
                    name_matched = True
                    matched_name_signal = f"First and last name match: {first_name} {last_name}"
                elif last_name and len(last_name) >= 4 and (f" {last_name} " in f" {txn_desc} " or f" {last_name} " in f" {txn_payer} "):
                    name_matched = True
                    matched_name_signal = f"Last name match: {last_name}"

                if name_matched:
                    # Look for tenant's invoices
                    t_invoices = [i for i in invoices if i.tenant_id == t.id]
                    for inv in t_invoices:
                        bal = float(inv.balance_due or inv.total_amount)
                        # Exact amount match
                        if abs(txn_amt - bal) <= 10.0 or abs(txn_amt - float(inv.total_amount)) <= 10.0:
                            signals.append(matched_name_signal)
                            signals.append(f"Exact balance match: RWF {txn_amt:,.0f}")
                            # Date proximity bonus
                            if inv.due_date and abs((txn_date - inv.due_date).days) <= 35:
                                signals.append(f"Date proximity: {txn_date} vs due date {inv.due_date}")
                                score = 0.95
                            else:
                                score = 0.88
                            method = "EXACT_NAME_AMOUNT_MATCH"
                            best_invoice = inv
                            best_tenant = t
                            break
                        # Partial payment match
                        elif txn_amt < bal:
                            signals.append(matched_name_signal)
                            signals.append(f"Partial amount match: RWF {txn_amt:,.0f} of {bal:,.0f}")
                            score = 0.80
                            method = "PARTIAL_PAYMENT_MATCH"
                            best_invoice = inv
                            best_tenant = t
                            break

                    if not best_invoice and t_invoices:
                        # Fallback: Pick nearest due invoice for matched tenant
                        best_invoice = sorted(t_invoices, key=lambda i: abs((txn_date - (i.due_date or txn_date)).days))[0]
                        best_tenant = t
                        signals.append(matched_name_signal)
                        signals.append(f"Amount mismatch (Txn: {txn_amt:,.0f}, Inv: {best_invoice.balance_due:,.0f})")
                        score = 0.65
                        method = "NAME_ONLY_MATCH"
                    break

        # 3. Match by Unit Number + Property / Amount
        if not best_invoice:
            for inv in invoices:
                bal = float(inv.balance_due or inv.total_amount)
                if abs(txn_amt - bal) <= 10.0:
                    # check if unit or property code in description
                    # Load unit
                    unit_res = await session.execute(select(Unit).where(Unit.id == inv.unit_id))
                    unit = unit_res.scalar_one_or_none()
                    if unit and unit.unit_number and (f" {unit.unit_number.upper()} " in f" {txn_desc} " or f"UNIT {unit.unit_number.upper()}" in txn_desc):
                        signals.append(f"Unit number match: {unit.unit_number}")
                        signals.append(f"Exact amount match: RWF {txn_amt:,.0f}")
                        score = 0.82
                        method = "UNIT_AMOUNT_MATCH"
                        best_invoice = inv
                        for t in tenants:
                            if t.id == inv.tenant_id:
                                best_tenant = t
                                break
                        break

        return best_tenant, best_invoice, score, method, signals

    @staticmethod
    async def process_bank_statement(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        file_name: str,
        content_str: str,
        property_id: Optional[uuid.UUID] = None,
        bank_account_id: Optional[uuid.UUID] = None,
        auto_confirm_high_confidence: bool = True
    ) -> BankStatement:
        """Processes raw statement content, creates transactions, executes matching engine, and reconciles."""
        raw_txns = TrackerService.parse_statement_content(content_str, file_name)

        statement = BankStatement(
            landlord_id=landlord_id,
            property_id=property_id,
            bank_account_id=bank_account_id,
            file_name=file_name,
            file_type="CSV" if file_name.endswith(".csv") else "XLSX" if file_name.endswith((".xlsx", ".xls")) else "TXT",
            file_size=len(content_str),
            total_transactions_count=len(raw_txns),
            status="PROCESSING"
        )
        session.add(statement)
        await session.flush()

        matched_count = 0
        unmatched_count = 0
        duplicate_count = 0
        total_incoming = 0.0
        matched_amount = 0.0

        min_date: Optional[date] = None
        max_date: Optional[date] = None

        for raw_txn in raw_txns:
            txn_date = raw_txn["transaction_date"]
            if min_date is None or txn_date < min_date:
                min_date = txn_date
            if max_date is None or txn_date > max_date:
                max_date = txn_date

            amt = raw_txn["amount"]
            if raw_txn.get("is_credit", True):
                total_incoming += amt

            ref = raw_txn.get("transaction_reference")

            # Check for duplicate
            dup_query = (
                select(BankTransaction)
                .where(
                    BankTransaction.landlord_id == landlord_id,
                    BankTransaction.transaction_date == txn_date,
                    BankTransaction.amount == amt,
                    BankTransaction.transaction_reference == ref
                )
            )
            dup_res = await session.execute(dup_query)
            existing = dup_res.scalar_one_or_none()

            if existing:
                duplicate_count += 1
                txn_obj = BankTransaction(
                    statement_id=statement.id,
                    landlord_id=landlord_id,
                    transaction_reference=ref,
                    transaction_date=txn_date,
                    amount=amt,
                    currency=raw_txn.get("currency", "RWF"),
                    is_credit=raw_txn.get("is_credit", True),
                    payer_name=raw_txn.get("payer_name"),
                    description=raw_txn.get("description", ""),
                    raw_text=raw_txn.get("raw_text"),
                    matching_status="DUPLICATE",
                    confidence_score=0.0
                )
                session.add(txn_obj)
                continue

            # Create BankTransaction
            txn_obj = BankTransaction(
                statement_id=statement.id,
                landlord_id=landlord_id,
                transaction_reference=ref,
                transaction_date=txn_date,
                amount=amt,
                currency=raw_txn.get("currency", "RWF"),
                is_credit=raw_txn.get("is_credit", True),
                payer_name=raw_txn.get("payer_name"),
                description=raw_txn.get("description", ""),
                raw_text=raw_txn.get("raw_text"),
                matching_status="UNMATCHED",
                confidence_score=0.0
            )
            session.add(txn_obj)
            await session.flush()

            # Execute matching
            tenant, invoice, conf_score, method, signals = await TrackerService.match_transaction(
                session, txn_obj, landlord_id, property_id
            )

            txn_obj.confidence_score = conf_score
            txn_obj.match_method = method

            if tenant and invoice:
                txn_obj.matched_tenant_id = tenant.id
                txn_obj.matched_invoice_id = invoice.id

                conf_label = "HIGH" if conf_score >= 0.85 else "MEDIUM" if conf_score >= 0.60 else "LOW"

                if conf_score >= 0.85:
                    txn_obj.matching_status = "MATCHED"
                    matched_count += 1
                    matched_amount += amt
                else:
                    txn_obj.matching_status = "NEEDS_REVIEW"
                    unmatched_count += 1

                # Create PaymentMatch record
                match_record = PaymentMatch(
                    transaction_id=txn_obj.id,
                    statement_id=statement.id,
                    landlord_id=landlord_id,
                    tenant_id=tenant.id,
                    invoice_id=invoice.id,
                    matched_amount=min(amt, float(invoice.balance_due or invoice.total_amount)),
                    confidence=conf_label,
                    confidence_score=conf_score,
                    matching_signals="; ".join(signals),
                    review_status="AUTO_CONFIRMED" if (auto_confirm_high_confidence and conf_score >= 0.85) else "PENDING_REVIEW"
                )
                session.add(match_record)
                await session.flush()

                # If auto-confirming high confidence match, create actual Payment & Receipt in Notify
                if auto_confirm_high_confidence and conf_score >= 0.85:
                    try:
                        payment, receipt = await PaymentService.process_payment(
                            session=session,
                            invoice_id=invoice.id,
                            amount=float(match_record.matched_amount),
                            payment_method=PaymentMethod.BANK_TRANSFER,
                            payment_channel=PaymentChannel.OFFLINE,
                            transaction_reference=txn_obj.transaction_reference or f"TXN-{uuid.uuid4().hex[:10].upper()}",
                            notes=f"Auto-reconciled via Tracker from Bank Statement: {file_name} ({txn_obj.description})",
                            auto_verify=True
                        )
                        txn_obj.matched_payment_id = payment.id
                        match_record.payment_id = payment.id
                        match_record.confirmed_at = datetime.now(timezone.utc)
                    except Exception as err:
                        logger.warning(f"Could not auto-process payment for match: {err}")
            else:
                txn_obj.matching_status = "UNMATCHED"
                unmatched_count += 1

        statement.period_start = min_date
        statement.period_end = max_date
        statement.matched_count = matched_count
        statement.unmatched_count = unmatched_count
        statement.duplicate_count = duplicate_count
        statement.total_incoming_amount = total_incoming
        statement.matched_amount = matched_amount
        statement.status = "COMPLETED"

        await session.commit()
        await session.refresh(statement)
        return statement

    @staticmethod
    async def confirm_manual_match(
        session: AsyncSession,
        transaction_id: uuid.UUID,
        invoice_id: uuid.UUID,
        landlord_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> PaymentMatch:
        """Manually links a transaction to an invoice and generates official payment & receipt."""
        txn_res = await session.execute(
            select(BankTransaction).where(BankTransaction.id == transaction_id, BankTransaction.landlord_id == landlord_id)
        )
        txn = txn_res.scalar_one_or_none()
        if not txn:
            raise ValueError("Transaction not found")

        inv_res = await session.execute(
            select(Invoice).where(Invoice.id == invoice_id, Invoice.landlord_id == landlord_id)
        )
        invoice = inv_res.scalar_one_or_none()
        if not invoice:
            raise ValueError("Invoice not found")

        # Process payment
        pay_amount = min(float(txn.amount), float(invoice.balance_due or invoice.total_amount))
        payment, receipt = await PaymentService.process_payment(
            session=session,
            invoice_id=invoice.id,
            amount=pay_amount,
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_channel=PaymentChannel.OFFLINE,
            transaction_reference=txn.transaction_reference or f"TXN-{uuid.uuid4().hex[:10].upper()}",
            notes=f"Manually matched via Tracker: {notes or txn.description}",
            auto_verify=True
        )

        txn.matching_status = "MATCHED"
        txn.matched_tenant_id = invoice.tenant_id
        txn.matched_invoice_id = invoice.id
        txn.matched_payment_id = payment.id
        txn.confidence_score = 1.0
        txn.match_method = "MANUAL_MATCH"

        # Update or create PaymentMatch
        match_res = await session.execute(
            select(PaymentMatch).where(PaymentMatch.transaction_id == txn.id)
        )
        match_obj = match_res.scalar_one_or_none()
        if not match_obj:
            match_obj = PaymentMatch(
                transaction_id=txn.id,
                statement_id=txn.statement_id,
                landlord_id=landlord_id,
                tenant_id=invoice.tenant_id,
                invoice_id=invoice.id,
                payment_id=payment.id,
                matched_amount=pay_amount,
                confidence="HIGH",
                confidence_score=1.0,
                matching_signals="Manual landlord confirmation",
                review_status="CONFIRMED_MANUALLY",
                confirmed_at=datetime.now(timezone.utc),
                notes=notes
            )
            session.add(match_obj)
        else:
            match_obj.tenant_id = invoice.tenant_id
            match_obj.invoice_id = invoice.id
            match_obj.payment_id = payment.id
            match_obj.matched_amount = pay_amount
            match_obj.confidence = "HIGH"
            match_obj.confidence_score = 1.0
            match_obj.review_status = "CONFIRMED_MANUALLY"
            match_obj.confirmed_at = datetime.now(timezone.utc)
            match_obj.notes = notes

        # Update statement statistics
        stmt_res = await session.execute(select(BankStatement).where(BankStatement.id == txn.statement_id))
        stmt = stmt_res.scalar_one_or_none()
        if stmt:
            stmt.matched_count += 1
            if stmt.unmatched_count > 0:
                stmt.unmatched_count -= 1
            stmt.matched_amount = float(stmt.matched_amount) + pay_amount

        await session.commit()
        await session.refresh(match_obj)
        return match_obj

    @staticmethod
    async def get_tracker_data(
        session: AsyncSession,
        landlord_id: uuid.UUID,
        property_id: Optional[uuid.UUID] = None,
        period_type: str = "THIS_MONTH",  # TODAY, THIS_WEEK, THIS_MONTH, CUSTOM
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compiles the complete tracking payload combining Expected vs Actual payments,
        Today's tracking, Tenant breakdown list, Bank Statements, and Needs Review queue.
        """
        today = date.today()

        # Compute date range
        if period_type == "TODAY":
            p_start = today
            p_end = today
        elif period_type == "THIS_WEEK":
            p_start = today - timedelta(days=today.weekday())
            p_end = p_start + timedelta(days=6)
        elif period_type == "CUSTOM" and start_date_str and end_date_str:
            p_start = TrackerService.parse_date(start_date_str) or date(today.year, today.month, 1)
            p_end = TrackerService.parse_date(end_date_str) or today
        else:  # THIS_MONTH default
            p_start = date(today.year, today.month, 1)
            next_month = date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
            p_end = next_month - timedelta(days=1)

        # 1. Fetch properties & units
        prop_query = select(Property).where(Property.landlord_id == landlord_id)
        if property_id:
            prop_query = prop_query.where(Property.id == property_id)
        props = list((await session.execute(prop_query)).scalars().all())
        prop_ids = [p.id for p in props]

        if not prop_ids:
            return {
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
                    "expected_today_list": []
                },
                "tenant_tracking_list": [],
                "needs_review_transactions": [],
                "recent_statements": [],
                "payment_timeline": []
            }

        # 2. Fetch Leases & Tenancies
        lease_query = (
            select(Lease, Tenancy, TenantProfile, Unit, Property)
            .join(Tenancy, Tenancy.id == Lease.tenancy_id)
            .join(TenantProfile, TenantProfile.id == Tenancy.tenant_id)
            .join(Unit, Unit.id == Lease.unit_id)
            .join(Property, Property.id == Lease.property_id)
            .where(
                Lease.property_id.in_(prop_ids),
                Lease.status.in_([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING_SOON, LeaseStatus.PENDING_RENEWAL])
            )
        )
        lease_rows = (await session.execute(lease_query)).all()

        # 3. Fetch Invoices in period
        inv_query = (
            select(Invoice)
            .where(
                Invoice.property_id.in_(prop_ids),
                or_(
                    and_(Invoice.period_start >= p_start, Invoice.period_start <= p_end),
                    and_(Invoice.due_date >= p_start, Invoice.due_date <= p_end)
                )
            )
        )
        invoices = list((await session.execute(inv_query)).scalars().all())

        # 4. Fetch Payments in period
        pay_query = (
            select(Payment)
            .where(
                Payment.property_id.in_(prop_ids),
                Payment.paid_at >= datetime(p_start.year, p_start.month, p_start.day, tzinfo=timezone.utc),
                Payment.paid_at <= datetime(p_end.year, p_end.month, p_end.day, 23, 59, 59, tzinfo=timezone.utc),
                Payment.status == PaymentStatus.COMPLETED
            )
        )
        payments = list((await session.execute(pay_query)).scalars().all())

        # 5. Fetch Recent Bank Statements & Needs Review Transactions
        stmt_query = (
            select(BankStatement)
            .where(BankStatement.landlord_id == landlord_id)
            .order_by(desc(BankStatement.created_at))
            .limit(10)
        )
        statements = list((await session.execute(stmt_query)).scalars().all())

        review_query = (
            select(BankTransaction)
            .where(
                BankTransaction.landlord_id == landlord_id,
                BankTransaction.matching_status.in_(["NEEDS_REVIEW", "UNMATCHED"])
            )
            .order_by(desc(BankTransaction.transaction_date))
            .limit(30)
        )
        review_txns = list((await session.execute(review_query)).scalars().all())

        # Build Tenant Tracking Rows
        tenant_rows: List[Dict[str, Any]] = []
        total_expected_sum = 0.0
        total_received_sum = 0.0
        paid_tenants_cnt = 0
        unpaid_tenants_cnt = 0
        partial_tenants_cnt = 0

        paid_today_list: List[Dict[str, Any]] = []
        expected_today_list: List[Dict[str, Any]] = []
        received_today_amt = 0.0
        expected_today_amt = 0.0

        for lease, tenancy, tenant, unit, prop in lease_rows:
            rent_amount = float(lease.monthly_rent or unit.monthly_rent or 300000)
            
            # Find relevant invoice for this period
            lease_invs = [i for i in invoices if i.lease_id == lease.id or i.tenant_id == tenant.id]
            invoice = lease_invs[0] if lease_invs else None

            # Determine due date
            due_day = lease.rent_payment_due_day or 5
            try:
                due_date = date(p_start.year, p_start.month, min(due_day, 28))
            except Exception:
                due_date = p_start + timedelta(days=5)

            # Determine expected & paid amounts
            if invoice:
                expected_amt = float(invoice.total_amount)
                paid_amt = float(invoice.amount_paid)
                bal_due = float(invoice.balance_due)
                inv_due_date = invoice.due_date or due_date
            else:
                expected_amt = rent_amount
                # calculate payments from payment logs
                t_payments = [p for p in payments if p.lease_id == lease.id or p.tenant_id == tenant.id]
                paid_amt = sum(float(p.amount) for p in t_payments)
                bal_due = max(0.0, expected_amt - paid_amt)
                inv_due_date = due_date

            total_expected_sum += expected_amt
            total_received_sum += paid_amt

            # Find matching payment records
            t_pays = [p for p in payments if p.lease_id == lease.id or p.tenant_id == tenant.id]
            last_payment = sorted(t_pays, key=lambda p: p.paid_at or datetime.min, reverse=True)[0] if t_pays else None
            paid_date = last_payment.paid_at.date() if last_payment and last_payment.paid_at else None

            # Calculate Status
            # 🟢 PAID, 🟡 PAID_LATE, 🟠 PARTIAL, 🔴 NOT_PAID, ⚪ UPCOMING
            if paid_amt >= expected_amt - 1.0:
                paid_tenants_cnt += 1
                if paid_date and inv_due_date and paid_date > inv_due_date:
                    status = "PAID_LATE"
                else:
                    status = "PAID"
            elif paid_amt > 0:
                partial_tenants_cnt += 1
                status = "PARTIAL"
            else:
                if inv_due_date and today > inv_due_date:
                    unpaid_tenants_cnt += 1
                    status = "NOT_PAID"
                else:
                    status = "UPCOMING"

            # Check if expected today
            if inv_due_date == today:
                expected_today_amt += expected_amt
                expected_today_list.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": f"{tenant.first_name} {tenant.last_name}",
                    "property_name": prop.name,
                    "unit_number": unit.unit_number,
                    "expected_amount": expected_amt,
                    "status": status,
                    "paid_amount": paid_amt
                })

            # Check if paid today
            if paid_date == today and last_payment:
                received_today_amt += float(last_payment.amount)
                paid_today_list.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": f"{tenant.first_name} {tenant.last_name}",
                    "property_name": prop.name,
                    "unit_number": unit.unit_number,
                    "paid_amount": float(last_payment.amount),
                    "paid_time": last_payment.paid_at.strftime("%H:%M") if last_payment.paid_at else "Today",
                    "payment_reference": last_payment.payment_reference,
                    "channel": last_payment.payment_method.value if last_payment.payment_method else "Bank Transfer"
                })

            tenant_rows.append({
                "tenant_id": str(tenant.id),
                "tenant_name": f"{tenant.first_name} {tenant.last_name}",
                "tenant_phone": tenant.phone,
                "tenant_email": tenant.email,
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
                "match_confidence": "HIGH" if status in ["PAID", "PAID_LATE"] else "MEDIUM" if status == "PARTIAL" else "NONE",
                "payment_reference": last_payment.payment_reference if last_payment else None,
                "last_transaction_desc": last_payment.notes if last_payment else None
            })

        # Calculate Collection Rate %
        collection_rate = round((total_received_sum / total_expected_sum * 100), 1) if total_expected_sum > 0 else 0.0
        total_outstanding = max(0.0, total_expected_sum - total_received_sum)

        # Timeline calendar days
        timeline = []
        cur_day = p_start
        while cur_day <= p_end:
            day_expected = sum(r["expected_amount"] for r in tenant_rows if r["due_date"] == str(cur_day))
            day_paid = sum(r["paid_amount"] for r in tenant_rows if r["paid_date"] == str(cur_day))
            day_tenants = [r for r in tenant_rows if r["due_date"] == str(cur_day) or r["paid_date"] == str(cur_day)]
            timeline.append({
                "date": str(cur_day),
                "day_number": cur_day.day,
                "is_today": cur_day == today,
                "expected_amount": day_expected,
                "paid_amount": day_paid,
                "tenants_count": len(day_tenants),
                "has_overdue": any(t["status"] == "NOT_PAID" and cur_day < today for t in day_tenants)
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
                "expected_today_list": expected_today_list
            },
            "tenant_tracking_list": tenant_rows,
            "needs_review_transactions": [
                {
                    "id": str(t.id),
                    "statement_id": str(t.statement_id),
                    "transaction_reference": t.transaction_reference,
                    "transaction_date": str(t.transaction_date),
                    "amount": float(t.amount),
                    "payer_name": t.payer_name,
                    "description": t.description,
                    "matching_status": t.matching_status,
                    "confidence_score": t.confidence_score,
                    "suggested_tenant_id": str(t.matched_tenant_id) if t.matched_tenant_id else None,
                    "suggested_invoice_id": str(t.matched_invoice_id) if t.matched_invoice_id else None,
                    "match_method": t.match_method
                }
                for t in review_txns
            ],
            "recent_statements": [
                {
                    "id": str(s.id),
                    "file_name": s.file_name,
                    "file_type": s.file_type,
                    "file_size": s.file_size,
                    "uploaded_at": s.uploaded_at.isoformat() if s.uploaded_at else "",
                    "total_transactions_count": s.total_transactions_count,
                    "matched_count": s.matched_count,
                    "unmatched_count": s.unmatched_count,
                    "duplicate_count": s.duplicate_count,
                    "total_incoming_amount": float(s.total_incoming_amount),
                    "matched_amount": float(s.matched_amount),
                    "status": s.status
                }
                for s in statements
            ],
            "payment_timeline": timeline
        }
