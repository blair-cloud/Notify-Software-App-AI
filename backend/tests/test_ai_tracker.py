import pytest
import uuid
from datetime import date, timedelta
from backend.services.bank_statement_normalizer import BankStatementNormalizer
from backend.services.bank_statement_ai import BankStatementAIService
from backend.core.tracker_config import (
    TRACKER_MATCHING_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
    AMBIGUITY_DELTA,
)
from backend.models.tracker import BankTransaction
from backend.services.tracker_service import TrackerService, ExpectedPayment


# ============================================================================
# 1. BankStatementNormalizer Tests
# ============================================================================

def test_normalize_description_strips_bank_noise():
    raw_desc = "TRANSFER FROM BK// JEAN BOSCO UWIMANA REF: 9948271040"
    cleaned = BankStatementNormalizer.normalize_description(raw_desc)
    assert "TRANSFER FROM" not in cleaned
    assert "BK//" not in cleaned
    assert "JEAN BOSCO UWIMANA" in cleaned


def test_normalize_momo_description():
    raw_desc = "MOMO CASH IN / 250788123456 / RENT SEPT UNIT 4B"
    cleaned = BankStatementNormalizer.normalize_description(raw_desc)
    assert "MOMO" not in cleaned
    assert "CASH IN" not in cleaned
    assert "RENT SEPT UNIT 4B" in cleaned


def test_name_similarity_exact_and_reversed():
    # Exact match
    score, kind, _ = BankStatementNormalizer.name_similarity("Jean Bosco", "Jean Bosco")
    assert score == 1.0
    assert kind == "EXACT"

    # Reversed order (common in banking: Last First Middle)
    sim_reversed, _, _ = BankStatementNormalizer.name_similarity("Uwimana Jean Bosco", "Jean Bosco Uwimana")
    assert sim_reversed >= 0.90

    # Slight typo or single character variation
    sim_typo, _, _ = BankStatementNormalizer.name_similarity("Jean Bosco Uwimana", "Jean Bosko Uwimana")
    assert sim_typo >= 0.80

    # Completely different names
    sim_diff, _, _ = BankStatementNormalizer.name_similarity("Alice Mukamana", "Eric Ndayisaba")
    assert sim_diff < 0.30


def test_extract_references():
    desc = "PAYMENT FOR INV-2026-088 AND UNIT-4B VIA 0788123456"
    refs = BankStatementNormalizer.extract_references(desc)
    assert "2026-088" in refs["invoice_numbers"]
    assert "0788123456" in refs["phones"]


def test_parse_amount_and_date():
    assert BankStatementNormalizer.parse_amount("450,000.00 RWF") == 450000.0
    assert BankStatementNormalizer.parse_amount("1,200.50") == 1200.50
    assert BankStatementNormalizer.parse_amount(None) == 0.0

    assert BankStatementNormalizer.parse_date("2026-09-05") == date(2026, 9, 5)
    assert BankStatementNormalizer.parse_date("05/09/2026") == date(2026, 9, 5)


# ============================================================================
# 2. Deterministic Matching Engine Tests
# ============================================================================

def test_deterministic_scoring_exact_match():
    prop_id = uuid.uuid4()
    unit_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    lease_id = uuid.uuid4()
    inv_id = uuid.uuid4()

    expected = ExpectedPayment(
        tenant_id=tenant_id,
        tenant_name="Jean Bosco Uwimana",
        tenant_email="jean@notify.rw",
        tenant_phone="+250788123456",
        lease_id=lease_id,
        property_id=prop_id,
        property_name="Kigali Heights",
        unit_id=unit_id,
        unit_number="Unit 4B",
        expected_amount=500000.0,
        balance_due=500000.0,
        due_date=date(2026, 9, 5),
        invoice_id=inv_id,
        invoice_number="INV-2026-001",
    )

    txn = BankTransaction(
        id=uuid.uuid4(),
        statement_id=uuid.uuid4(),
        landlord_id=uuid.uuid4(),
        transaction_date=date(2026, 9, 5),
        amount=500000.0,
        currency="RWF",
        is_credit=True,
        payer_name="Jean Bosco Uwimana",
        description="Rent Sept Unit 4B INV-2026-001",
        transaction_reference="INV-2026-001",
    )

    candidate = TrackerService._score_against_expected(
        transaction=txn,
        expected=expected,
    )

    # With exact amount (0.40), exact name (0.25), exact reference (0.15),
    # exact date (0.15), and property context (0.05) -> total should be >= 0.95
    assert candidate.score >= 0.95
    assert candidate.confidence_level == "AUTO_MATCH"
    assert candidate.match_score >= 95
    assert any("exact" in r.lower() or "full" in r.lower() for r in candidate.reasons)


def test_confidence_brackets():
    # Verify configured brackets in tracker_config
    assert CONFIDENCE_THRESHOLDS["AUTO_MATCH"] == 95.0
    assert CONFIDENCE_THRESHOLDS["STRONG_MATCH"] == 80.0
    assert CONFIDENCE_THRESHOLDS["REVIEW_REQUIRED"] == 60.0
    assert CONFIDENCE_THRESHOLDS["UNMATCHED"] == 0.0


# ============================================================================
# 3. Ambiguity Guard Tests
# ============================================================================

def test_ambiguity_guard_multiple_close_candidates():
    prop_id = uuid.uuid4()
    unit_1 = uuid.uuid4()
    unit_2 = uuid.uuid4()

    candidate1 = ExpectedPayment(
        tenant_id=uuid.uuid4(),
        tenant_name="Jean Uwimana",
        tenant_email="jean@test.com",
        tenant_phone="",
        lease_id=uuid.uuid4(),
        property_id=prop_id,
        property_name="Sunset Apartments",
        unit_id=unit_1,
        unit_number="101",
        expected_amount=300000.0,
        balance_due=300000.0,
        due_date=date(2026, 9, 1),
        invoice_id=uuid.uuid4(),
        invoice_number="INV-101",
    )

    candidate2 = ExpectedPayment(
        tenant_id=uuid.uuid4(),
        tenant_name="John Uwimana",
        tenant_email="john@test.com",
        tenant_phone="",
        lease_id=uuid.uuid4(),
        property_id=prop_id,
        property_name="Sunset Apartments",
        unit_id=unit_2,
        unit_number="102",
        expected_amount=300000.0,
        balance_due=300000.0,
        due_date=date(2026, 9, 1),
        invoice_id=uuid.uuid4(),
        invoice_number="INV-102",
    )

    # Transaction with ambiguous payer
    txn = BankTransaction(
        id=uuid.uuid4(),
        statement_id=uuid.uuid4(),
        landlord_id=uuid.uuid4(),
        transaction_date=date(2026, 9, 1),
        amount=300000.0,
        currency="RWF",
        is_credit=True,
        payer_name="J. Uwimana",
        description="Rent payment",
        transaction_reference="TXN-AMBIG",
    )

    c1 = TrackerService._score_against_expected(txn, candidate1)
    c2 = TrackerService._score_against_expected(txn, candidate2)

    # Scores are close within ambiguity delta
    delta = abs(c1.score - c2.score)
    assert delta <= AMBIGUITY_DELTA


# ============================================================================
# 4. Fallback Parser & Financial Safety Tests
# ============================================================================

@pytest.mark.asyncio
async def test_fallback_csv_parser():
    csv_sample = (
        "Date,Description,Amount,Balance\n"
        "2026-09-01,RENT FROM UWIMANA JEAN BOSCO,450000,1250000\n"
        "2026-09-02,TRANSFER IN ALICE MUKAMANA,300000,1550000\n"
    )

    result = await BankStatementAIService.interpret_statement(
        file_bytes=csv_sample.encode("utf-8"),
        file_name="statement.csv",
        content_type="text/csv",
    )

    assert result["status"] in ("COMPLETED", "FALLBACK", "success")
    assert len(result["transactions"]) == 2
    assert result["transactions"][0]["amount"] == 450000.0
    assert result["transactions"][0]["payer_name"] == "UWIMANA JEAN BOSCO"
    assert result["transactions"][1]["amount"] == 300000.0


def test_financial_safety_no_automatic_payments_from_ai():
    """
    Ensure that BankStatementAIService only returns structured transaction JSON,
    and has no imports or capabilities to call PaymentService or update invoice status directly.
    """
    import inspect
    import backend.services.bank_statement_ai as ai_module

    source = inspect.getsource(ai_module)
    assert "process_payment" not in source
    assert "mark_paid" not in source
    assert "invoice.status = 'PAID'" not in source
