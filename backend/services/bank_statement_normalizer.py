"""
Normalization Layer for Bank Statement Transactions & Metadata.

Standardizes names, descriptions, references, amounts, and dates prior to
deterministic matching against landlord lease and invoice records.
"""

import re
from datetime import datetime, date
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.core.tracker_config import NOISE_PREFIX_PATTERNS, DEFAULT_CURRENCY


class BankStatementNormalizer:
    """Normalizes extracted bank transactions into canonical matching entities."""

    # ------------------------------------------------------------------
    # Name Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_name(raw_name: Optional[str]) -> str:
        """
        Cleans and canonicalizes a person or company name:
        - Lowercase
        - Removes punctuation / special symbols
        - Normalizes multiple spaces into a single space
        """
        if not raw_name:
            return ""
        # Keep letters, numbers, spaces
        cleaned = re.sub(r"[^A-Za-z0-9\s]", " ", str(raw_name).lower())
        return re.sub(r"\s+", " ", cleaned).strip()

    @staticmethod
    def name_tokens(raw_name: Optional[str]) -> List[str]:
        """Returns non-trivial name tokens (length >= 2)."""
        norm = BankStatementNormalizer.normalize_name(raw_name)
        return [t for t in norm.split() if len(t) >= 2]

    @staticmethod
    def name_similarity(name_a: Optional[str], name_b: Optional[str]) -> Tuple[float, str, str]:
        """
        Calculates similarity (0.0 to 1.0) between two names, handling:
        - Exact match
        - Reordered names ("MUGISHA ALEX" vs "ALEX MUGISHA")
        - Extra middle names ("ALEX MARIE MUGISHA" vs "ALEX MUGISHA")
        - Common shortenings / initials ("A. MUGISHA" or "ALEX M.")
        - Spelling variants ("MUGISHA" vs "MUGISHAH")

        Returns: (similarity_score_0_to_1, match_kind, human_reason)
        """
        norm_a = BankStatementNormalizer.normalize_name(name_a)
        norm_b = BankStatementNormalizer.normalize_name(name_b)

        if not norm_a or not norm_b:
            return 0.0, "NONE", ""

        if norm_a == norm_b:
            return 1.0, "EXACT", f"Exact name match with '{name_a}'"

        # Containment check
        if norm_a in norm_b or norm_b in norm_a:
            return 0.95, "CONTAINED", f"Name contains full registered name '{name_a}'"

        tokens_a = set(BankStatementNormalizer.name_tokens(name_a))
        tokens_b = set(BankStatementNormalizer.name_tokens(name_b))

        if not tokens_a or not tokens_b:
            ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
            return ratio, "SPELLING" if ratio >= 0.80 else "WEAK", ""

        # Reordered tokens: same words, different order
        if tokens_a == tokens_b:
            return 0.96, "REORDERED", f"Matches '{name_a}' (same names in different order)"

        # Partial token intersection
        intersection = tokens_a & tokens_b
        if intersection:
            overlap_ratio = len(intersection) / max(len(tokens_a), len(tokens_b))
            if overlap_ratio >= 0.66:
                return round(0.85 + (overlap_ratio * 0.10), 2), "TOKEN_OVERLAP", f"Strong token match with '{name_a}'"
            elif len(intersection) >= 1 and (len(tokens_a) == 1 or len(tokens_b) == 1):
                return 0.75, "PARTIAL", f"Partial token match with '{name_a}'"

        # Check for initials and single-letter matches (e.g. "A MUGISHA" vs "ALEX MUGISHA")
        for ta in tokens_a:
            for tb in tokens_b:
                if len(ta) == 1 and tb.startswith(ta):
                    return 0.82, "INITIAL_MATCH", f"Initial '{ta.upper()}' matches '{tb.title()}' in '{name_a}'"
                if len(tb) == 1 and ta.startswith(tb):
                    return 0.82, "INITIAL_MATCH", f"Initial '{tb.upper()}' matches '{ta.title()}' in '{name_b}'"

        # Overall string similarity fallback
        ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
        if ratio >= 0.82:
            return round(ratio, 2), "SPELLING", f"Spelling similarity with '{name_a}'"

        return round(ratio * 0.5, 2), "WEAK", ""

    # ------------------------------------------------------------------
    # Description Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_description(raw_desc: Optional[str]) -> str:
        """
        Cleans bank transaction narration:
        - Removes common bank prefixes (BK TRF, MTN MOMO, etc.)
        - Normalizes whitespace
        """
        if not raw_desc:
            return ""
        cleaned = raw_desc.strip()
        # Repeatedly strip matching prefixes (e.g. "TRANSFER FROM BK// ...")
        changed = True
        while changed:
            changed = False
            for pat in NOISE_PREFIX_PATTERNS:
                new_desc = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()
                if new_desc != cleaned:
                    cleaned = new_desc
                    changed = True
        return re.sub(r"\s+", " ", cleaned).strip()


    # ------------------------------------------------------------------
    # Reference & Entity Extraction
    # ------------------------------------------------------------------

    @staticmethod
    def extract_references(description: str) -> Dict[str, Any]:
        """
        Detects invoice numbers, lease numbers, phone numbers, and transaction IDs
        embedded inside description text.
        """
        if not description:
            return {"invoice_numbers": [], "lease_numbers": [], "phones": [], "txn_ids": []}

        desc = description.upper()
        found_invoices: Set[str] = set()
        found_leases: Set[str] = set()
        found_phones: Set[str] = set()
        found_txns: Set[str] = set()

        # Invoices: INV-1042, INV1042, #1042, INVOICE #1042, INV-2026-001
        inv_matches = re.findall(r'(?:INV|INVOICE|FACT)[\s\-_#:]*([A-Z0-9\-]{3,20})', desc)
        for m in inv_matches:
            found_invoices.add(m.strip("-# "))

        # Generic hash numbers: #1042
        hash_matches = re.findall(r'#([0-9]{3,8})', desc)
        for m in hash_matches:
            found_invoices.add(m)

        # Leases: LSE-1002, LEASE 102
        lease_matches = re.findall(r'(?:LSE|LEASE|BAIL)[\s\-_#:]*([A-Z0-9\-]{3,20})', desc)
        for m in lease_matches:
            found_leases.add(m.strip("-# "))

        # Rwandan / East African Phone Numbers: 25078..., 078..., 079..., 072..., 073...
        phone_matches = re.findall(r'(?:250\d{9}|07[2389]\d{7})', description)
        for p in phone_matches:
            found_phones.add(p)

        # Transaction references: REF: ..., TXN: ..., ID: ...
        ref_matches = re.findall(r'(?:REF|TXN|ID)[:\s\-]+([A-Z0-9\-]{6,25})', desc)
        for r in ref_matches:
            found_txns.add(r.strip("-# "))

        return {
            "invoice_numbers": list(found_invoices),
            "lease_numbers": list(found_leases),
            "phones": list(found_phones),
            "txn_ids": list(found_txns),
        }

    # ------------------------------------------------------------------
    # Amount & Currency Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_amount(val: Any) -> float:
        """Parses and sanitizes numeric amounts from string or numeric representations."""
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return abs(float(val))
        s = str(val).strip()
        # Remove currency symbols and formatting commas
        s = re.sub(r'[RWF|FRW|USD|EUR|\s]', '', s, flags=re.IGNORECASE)
        s = s.replace(',', '')
        try:
            return abs(float(s))
        except ValueError:
            return 0.0

    # ------------------------------------------------------------------
    # Date Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_date(val: Any) -> Optional[date]:
        """Normalizes any common date format into an ISO date object."""
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
            "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val_str[:19], fmt).date()
            except Exception:
                continue

        # Regex fallback for ISO YYYY-MM-DD
        m_iso = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', val_str)
        if m_iso:
            try:
                return date(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)))
            except Exception:
                pass

        # Regex fallback for DD-MM-YYYY
        m_dmy = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', val_str)
        if m_dmy:
            try:
                return date(int(m_dmy.group(3)), int(m_dmy.group(2)), int(m_dmy.group(1)))
            except Exception:
                pass

        return None

    # Convenience aliases
    parse_amount = normalize_amount
    parse_date = normalize_date
