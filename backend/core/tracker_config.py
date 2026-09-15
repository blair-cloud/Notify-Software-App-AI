"""
Configuration for Notify Payment Tracker & Matching Engine.

Configures:
1. Signal weights for the deterministic scoring engine.
2. Confidence level brackets (AUTO_MATCH, STRONG_MATCH, REVIEW_REQUIRED, UNMATCHED).
3. Ambiguity threshold (preventing silent auto-match for multiple similar candidates).
4. Normalization and bank-specific keywords for regional banks (Bank of Kigali, Equity, BPR, I&M, MTN MoMo, Airtel).
"""

from typing import Dict, Any, List

# ---------------------------------------------------------------------------
# Deterministic Matching Weights (Total = 1.00 / 100%)
# ---------------------------------------------------------------------------
MATCH_WEIGHTS: Dict[str, float] = {
    # Exact or near-exact amount vs expected balance/rent
    "amount": 0.40,
    # Tenant name similarity (token overlap, reordered, spelling variants)
    "name": 0.25,
    # Invoice or lease reference number found in transaction description
    "reference": 0.15,
    # Proximity between payment date and invoice due date
    "date_proximity": 0.15,
    # Property name or unit number context in narration
    "property_context": 0.05,
}
TRACKER_MATCHING_WEIGHTS = MATCH_WEIGHTS

# ---------------------------------------------------------------------------
# Historical Correction Learning Boost
# When a landlord previously confirmed this payer/narration pattern for a tenant,
# boost the base score to prioritize confirmed historical behavior.
# ---------------------------------------------------------------------------
CORRECTION_LEARNING_BOOST: float = 0.15

# ---------------------------------------------------------------------------
# Confidence Level Thresholds (0 - 100)
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLDS = {
    "AUTO_MATCH": 95.0,        # 95 - 100: Very high confidence, safe to propose as auto-match
    "STRONG_MATCH": 80.0,      # 80 - 94: High confidence, recommended for quick approval
    "REVIEW_REQUIRED": 60.0,   # 60 - 79: Moderate confidence or amount mismatch, landlord review
    "UNMATCHED": 0.0,          # 0 - 59: Low or no confident match
}

# ---------------------------------------------------------------------------
# Ambiguity Threshold
# If two candidate tenants have scores within AMBIGUITY_SCORE_DELTA of each other
# and both score above AMBIGUITY_MIN_SCORE, do NOT auto-match. Present both candidates!
# ---------------------------------------------------------------------------
AMBIGUITY_SCORE_DELTA: float = 0.10  # 10%
AMBIGUITY_MIN_SCORE: float = 0.50    # 50%
AMBIGUITY_DELTA = AMBIGUITY_SCORE_DELTA

# ---------------------------------------------------------------------------
# Regional Bank & Mobile Money Narration Keywords & Prefixes (Rwanda / East Africa)
# ---------------------------------------------------------------------------
NOISE_PREFIX_PATTERNS: List[str] = [
    r"^(?:BK|BOK)[/:\s-]+",
    r"^(?:BK|BOK)\s+(?:TRF|TRANSFER|IBANK|POS|ATM|DEPOSIT)[:\s-]*",
    r"^(?:EQUITY|EQ)\s+(?:TRF|TRANSFER|EAZZY|DIRECT)[:\s-]*",
    r"^(?:BPR|BPR\s+ATLAS\s+MARA)\s+(?:TRF|TRANSFER|IBANK)[:\s-]*",
    r"^(?:I&M|IM)\s+(?:TRF|TRANSFER|SPENN)[:\s-]*",
    r"^(?:COGEBANQUE|COGE)\s+(?:TRF|TRANSFER)[:\s-]*",
    r"^(?:MTN\s+MOMO|MTN\s+MOBILE\s+MONEY|MOMO|M-MONEY)\s*(?:CASH\s+(?:IN|OUT))?[\*:\s\/-]*",
    r"^(?:AIRTEL\s+MONEY|AIRTEL)\s*(?:CASH\s+(?:IN|OUT))?[\*:\s\/-]*",
    r"^(?:TRF\s+FROM|TRANSFER\s+FROM|PAYMENT\s+FROM|RECEIVED\s+FROM|DEPOSIT\s+BY|FUNDS\s+TRF\s+FROM)[:\s-]*",
    r"^(?:DIRECT\s+CREDIT|INWARD\s+TRANSFER|REMITTANCE)[:\s-]*",
]

# Standard default currency
DEFAULT_CURRENCY: str = "RWF"
