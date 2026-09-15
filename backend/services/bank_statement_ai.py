"""
AI Document Understanding Service for Bank Statements using Google Gemini API.

Integrates Gemini's multimodal vision and document understanding capabilities:
- Native PDF understanding (scanned or digital, multi-column tables, visual OCR)
- Image formats (PNG, JPG, TIFF)
- Excel / CSV structured tables
- Strict JSON Schema output with transaction and statement-level metadata
- Robust fallback to structured parsing when GEMINI_API_KEY is not configured
"""

import base64
import csv
import io
import json
import re
import time
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.core.config import settings
from backend.core.logging import logger

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_PROMPT = """You are interpreting a bank statement for a rental-management platform (Notify).
Your task is to analyze the document visual structure and extract all transactions and statement-level details into strict structured JSON.

Key Instructions:
1. Understand the visual table structure, multi-page layouts, and headers across pages.
2. Identify transaction rows correctly. Do not miss any transaction row.
3. Distinguish credits (inflows, deposits, received funds) from debits (withdrawals, bank fees, outgoing transfers).
4. DO NOT confuse the running account balance with the transaction amount. The amount is the specific sum transferred/deposited.
5. Preserve original transaction dates (convert to ISO format YYYY-MM-DD).
6. Extract payer/sender names from transaction descriptions or particulars when possible (e.g. from 'TRANSFER FROM JOHN DOE' or 'MOMO * ALICE MUGISHA' extract payer name).
7. Extract invoice, lease, or transaction reference numbers when present (e.g. INV-1042, RCT-992, or bank reference IDs).
8. Preserve the full, original transaction description in the 'description' field.
9. DO NOT invent names, amounts, dates, or references. If a field cannot be confidently identified, return null.
10. For every transaction, estimate an extraction confidence score between 0.0 and 1.0 based on clarity.

Return ONLY valid JSON matching this exact structure:
{
  "statement": {
    "bank_name": "Bank Name or null",
    "account_name": "Account Holder Name or null",
    "account_number_masked": "Masked Account Number or null",
    "statement_start_date": "YYYY-MM-DD or null",
    "statement_end_date": "YYYY-MM-DD or null",
    "opening_balance": 0.0,
    "closing_balance": 0.0,
    "currency": "RWF"
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Original raw transaction description",
      "payer_name": "Extracted payer name or null",
      "reference": "Extracted transaction or invoice reference or null",
      "amount": 0.0,
      "currency": "RWF",
      "type": "credit or debit",
      "account_reference": "Payer bank account / phone if present or null",
      "balance_after": 0.0,
      "confidence": 0.95
    }
  ]
}
"""


class BankStatementAIService:
    """Service to process bank statements with Gemini API or structured fallback."""

    @classmethod
    def get_api_key(cls) -> Optional[str]:
        return getattr(settings, "GEMINI_API_KEY", None) or ""

    @classmethod
    def get_model(cls) -> str:
        return getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash") or "gemini-3.6-flash"

    @classmethod
    async def extract_statement(
        cls,
        file_bytes: bytes,
        file_name: str,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract bank statement into structured schema.
        Returns:
            {
                "provider": "google-gemini" | "structured-fallback",
                "model": "gemini-2.5-flash" | "rule-based",
                "status": "COMPLETED" | "FALLBACK",
                "raw_response": str (JSON string),
                "statement_metadata": Dict[str, Any],
                "transactions": List[Dict[str, Any]],
                "errors": Optional[str],
                "duration_ms": int,
            }
        """
        start_time = time.time()
        api_key = cls.get_api_key()
        lower_name = file_name.lower()

        # Determine mime type
        mime_type = content_type or "application/octet-stream"
        if lower_name.endswith(".pdf"):
            mime_type = "application/pdf"
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
            mime_type = "image/png" if lower_name.endswith(".png") else "image/jpeg"
        elif lower_name.endswith(".csv"):
            mime_type = "text/csv"
        elif lower_name.endswith((".xlsx", ".xls")):
            mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        # If CSV or Excel, we can also extract text directly
        is_tabular = lower_name.endswith((".csv", ".tsv", ".xlsx", ".xls"))

        if not api_key:
            logger.info("GEMINI_API_KEY not configured. Using structured fallback parser for %s", file_name)
            return cls._fallback_parse(file_bytes, file_name, start_time, reason="No GEMINI_API_KEY set")

        try:
            # 1. Attempt Gemini document understanding
            result = await cls._call_gemini(file_bytes, mime_type, file_name)
            duration_ms = int((time.time() - start_time) * 1000)

            return {
                "provider": "google-gemini",
                "model": cls.get_model(),
                "status": "COMPLETED",
                "raw_response": result.get("raw_response", "{}"),
                "statement_metadata": result.get("statement", {}),
                "transactions": result.get("transactions", []),
                "errors": None,
                "duration_ms": duration_ms,
            }
        except Exception as exc:
            logger.error("Gemini API document extraction failed: %s. Falling back to structured parser.", exc)
            fallback_res = cls._fallback_parse(
                file_bytes, file_name, start_time, reason=f"Gemini API error: {str(exc)}"
            )
            fallback_res["errors"] = str(exc)
            return fallback_res

    @classmethod
    async def _call_gemini(cls, file_bytes: bytes, mime_type: str, file_name: str) -> Dict[str, Any]:
        """Call Gemini REST API v1beta generateContent with structured JSON schema."""
        api_key = cls.get_api_key()
        model = cls.get_model()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        # If text/csv or plain text, pass as text part; if binary PDF or image, pass base64
        parts = []
        if mime_type.startswith("text/") or file_name.lower().endswith((".csv", ".txt", ".tsv")):
            try:
                text_content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = file_bytes.decode("latin-1", errors="ignore")
            parts.append({"text": f"Bank statement file '{file_name}':\n\n{text_content}"})
        else:
            # Base64 inline data for PDF or images
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": b64_data,
                }
            })
            parts.append({"text": f"Extract all transactions and metadata from this uploaded bank statement document ({file_name})."})

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")

            resp_data = resp.json()

        # Parse output from candidates
        candidates = resp_data.get("candidates", [])
        if not candidates:
            raise ValueError("Gemini returned empty candidates")

        first_cand = candidates[0]
        content_parts = first_cand.get("content", {}).get("parts", [])
        if not content_parts:
            raise ValueError("No content parts in Gemini candidate")

        raw_text = content_parts[0].get("text", "{}")
        # Clean potential markdown backticks ```json ... ```
        cleaned_text = raw_text.strip()
        if cleaned_text.startswith("```"):
            cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
            cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

        parsed = json.loads(cleaned_text)
        return {
            "raw_response": cleaned_text,
            "statement": parsed.get("statement", {}),
            "transactions": parsed.get("transactions", []),
        }

    @classmethod
    def _fallback_parse(
        cls,
        file_bytes: bytes,
        file_name: str,
        start_time: float,
        reason: str = "",
    ) -> Dict[str, Any]:
        """Robust tabular/regex parser fallback for offline or CSV environments."""
        try:
            content_str = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content_str = file_bytes.decode("latin-1", errors="ignore")

        transactions: List[Dict[str, Any]] = []
        statement_meta: Dict[str, Any] = {
            "bank_name": "Bank Statement",
            "account_name": None,
            "account_number_masked": None,
            "statement_start_date": None,
            "statement_end_date": None,
            "opening_balance": 0.0,
            "closing_balance": 0.0,
            "currency": "RWF",
        }

        # Attempt CSV parsing
        try:
            reader = csv.reader(io.StringIO(content_str))
            rows = list(reader)
        except Exception:
            rows = []

        header_idx = -1
        headers: List[str] = []
        for i, row in enumerate(rows[:15]):
            joined = " ".join(row).lower()
            if any(kw in joined for kw in ["date", "description", "details", "narration", "credit", "amount", "balance"]):
                header_idx = i
                headers = [c.strip().lower() for c in row]
                break

        if header_idx != -1 and rows:
            date_col = desc_col = amount_col = credit_col = debit_col = ref_col = payer_col = bal_col = -1
            for idx, h in enumerate(headers):
                if "date" in h or "value date" in h or "txn date" in h:
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
                elif any(k in h for k in ["ref", "txn id", "trans id", "reference"]):
                    ref_col = idx
                elif any(k in h for k in ["payer", "sender", "beneficiary"]):
                    payer_col = idx
                elif "balance" in h:
                    bal_col = idx

            for row in rows[header_idx + 1:]:
                if not row or all(not str(c).strip() for c in row):
                    continue

                d_str = row[date_col].strip() if date_col != -1 and date_col < len(row) else ""
                parsed_date = cls._parse_date_str(d_str) or None

                desc = row[desc_col].strip() if desc_col != -1 and desc_col < len(row) else " ".join(row)
                amt = 0.0
                txn_type = "credit"

                if credit_col != -1 and credit_col < len(row) and row[credit_col].strip():
                    v = cls._clean_num(row[credit_col])
                    if v > 0:
                        amt = v
                        txn_type = "credit"
                elif amount_col != -1 and amount_col < len(row) and row[amount_col].strip():
                    amt = cls._clean_num(row[amount_col])
                    txn_type = "credit"
                elif debit_col != -1 and debit_col < len(row) and row[debit_col].strip():
                    amt = cls._clean_num(row[debit_col])
                    txn_type = "debit"

                if amt <= 0:
                    continue

                ref = row[ref_col].strip() if ref_col != -1 and ref_col < len(row) else None
                payer = row[payer_col].strip() if payer_col != -1 and payer_col < len(row) else None
                if not payer and desc:
                    m_from = re.search(r'(?:FROM|BY|IN)\s+([A-Za-z\s]{3,40})', desc, re.IGNORECASE)
                    if m_from:
                        payer = m_from.group(1).strip()
                bal = cls._clean_num(row[bal_col]) if bal_col != -1 and bal_col < len(row) else None

                transactions.append({
                    "date": parsed_date,
                    "description": desc,
                    "payer_name": payer,
                    "reference": ref,
                    "amount": amt,
                    "currency": "RWF",
                    "type": txn_type,
                    "account_reference": None,
                    "balance_after": bal,
                    "confidence": 0.85,
                })

        # Plain text line fallback if CSV yielded no rows
        if not transactions:
            for line in content_str.splitlines():
                line_str = line.strip()
                if len(line_str) < 10:
                    continue
                d = cls._parse_date_str(line_str)
                amounts = re.findall(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)', line_str)
                if amounts:
                    valid = [cls._clean_num(a) for a in amounts if cls._clean_num(a) >= 1000]
                    if valid:
                        chosen = max(valid)
                        transactions.append({
                            "date": d or None,
                            "description": line_str,
                            "payer_name": None,
                            "reference": None,
                            "amount": chosen,
                            "currency": "RWF",
                            "type": "credit",
                            "account_reference": None,
                            "balance_after": None,
                            "confidence": 0.70,
                        })

        if transactions:
            dates = [t["date"] for t in transactions if t.get("date")]
            if dates:
                statement_meta["statement_start_date"] = min(dates)
                statement_meta["statement_end_date"] = max(dates)

        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "provider": "structured-fallback",
            "model": "rule-based",
            "status": "FALLBACK",
            "raw_response": json.dumps({"statement": statement_meta, "transactions": transactions}),
            "statement_metadata": statement_meta,
            "transactions": transactions,
            "errors": reason or None,
            "duration_ms": duration_ms,
        }

    @staticmethod
    def _clean_num(val: Any) -> float:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).strip().replace(',', '').replace('RWF', '').replace('FRW', '').replace('USD', '').replace(' ', '')
        try:
            return abs(float(s))
        except ValueError:
            return 0.0

    @staticmethod
    def _parse_date_str(val: str) -> Optional[str]:
        if not val:
            return None
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d.%m.%Y",
            "%Y/%m/%d", "%d %b %Y", "%d-%b-%Y", "%d %B %Y"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(val.strip()[:19], fmt)
                return dt.strftime("%Y-%m-%d")
            except Exception:
                continue
        m_iso = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', val)
        if m_iso:
            try:
                return f"{int(m_iso.group(1)):04d}-{int(m_iso.group(2)):02d}-{int(m_iso.group(3)):02d}"
            except Exception:
                pass
        m_dmy = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', val)
        if m_dmy:
            try:
                return f"{int(m_dmy.group(3)):04d}-{int(m_dmy.group(2)):02d}-{int(m_dmy.group(1)):02d}"
            except Exception:
                pass
        return None

    # Alias for compatibility
    interpret_statement = extract_statement
