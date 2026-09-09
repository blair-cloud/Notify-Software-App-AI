import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.core.database import get_db
from backend.core.dependencies import get_current_landlord
from backend.models import LandlordProfile
from backend.models.tracker import BankAccount, BankStatement, BankTransaction, PaymentMatch
from backend.services.tracker_service import TrackerService

router = APIRouter(prefix="/tracker", tags=["Payment Tracker"])


class ManualMatchRequest(BaseModel):
    transaction_id: uuid.UUID
    invoice_id: uuid.UUID
    notes: Optional[str] = None


class ApproveMatchRequest(BaseModel):
    transaction_id: uuid.UUID
    notes: Optional[str] = None


class RejectMatchRequest(BaseModel):
    transaction_id: uuid.UUID
    reason: Optional[str] = None


class StatementUploadBody(BaseModel):
    property_id: Optional[uuid.UUID] = None
    bank_account_id: Optional[uuid.UUID] = None
    file_name: str
    content: str
    # Default False: never post a payment until the landlord approves / manually matches.
    auto_confirm: bool = False


class BankAccountCreate(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    currency: str = "RWF"
    is_primary: bool = True


@router.get("/dashboard")
async def get_tracker_dashboard(
    property_id: Optional[str] = None,
    period_type: str = "THIS_MONTH",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns Tracker overview data including the Matching Analysis Report for
    the most recent statement upload.
    """
    prop_uuid = uuid.UUID(property_id) if property_id and property_id != "ALL" else None
    return await TrackerService.get_tracker_data(
        session=db,
        landlord_id=landlord.id,
        property_id=prop_uuid,
        period_type=period_type,
        start_date_str=start_date,
        end_date_str=end_date
    )


@router.post("/upload-content")
async def upload_statement_content(
    body: StatementUploadBody,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and parse raw bank statement text. Matching suggestions are persisted;
    payments are only created when auto_confirm=true or after landlord approval.
    """
    stmt = await TrackerService.process_bank_statement(
        session=db,
        landlord_id=landlord.id,
        file_name=body.file_name,
        content_str=body.content,
        property_id=body.property_id,
        bank_account_id=body.bank_account_id,
        auto_confirm_high_confidence=body.auto_confirm
    )
    analysis = await TrackerService.get_statement_analysis(
        db, landlord.id, statement_id=stmt.id
    )
    return {
        "status": "success",
        "statement_id": str(stmt.id),
        "file_name": stmt.file_name,
        "total_transactions": stmt.total_transactions_count,
        "matched_count": stmt.matched_count,
        "unmatched_count": stmt.unmatched_count,
        "duplicate_count": stmt.duplicate_count,
        "total_incoming_amount": float(stmt.total_incoming_amount),
        "matched_amount": float(stmt.matched_amount),
        "period_start": str(stmt.period_start) if stmt.period_start else None,
        "period_end": str(stmt.period_end) if stmt.period_end else None,
        "matching_analysis_report": analysis,
    }


@router.post("/upload-file")
async def upload_statement_file(
    file: UploadFile = File(...),
    property_id: Optional[str] = Form(None),
    auto_confirm: bool = Form(False),
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """Upload a bank statement file for parsing and multi-signal matching."""
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content_str = content_bytes.decode('latin-1', errors='ignore')

    prop_uuid = uuid.UUID(property_id) if property_id and property_id != "ALL" else None

    stmt = await TrackerService.process_bank_statement(
        session=db,
        landlord_id=landlord.id,
        file_name=file.filename or "bank_statement.csv",
        content_str=content_str,
        property_id=prop_uuid,
        auto_confirm_high_confidence=auto_confirm
    )
    analysis = await TrackerService.get_statement_analysis(
        db, landlord.id, statement_id=stmt.id
    )
    return {
        "status": "success",
        "statement_id": str(stmt.id),
        "file_name": stmt.file_name,
        "total_transactions": stmt.total_transactions_count,
        "matched_count": stmt.matched_count,
        "unmatched_count": stmt.unmatched_count,
        "duplicate_count": stmt.duplicate_count,
        "total_incoming_amount": float(stmt.total_incoming_amount),
        "matched_amount": float(stmt.matched_amount),
        "period_start": str(stmt.period_start) if stmt.period_start else None,
        "period_end": str(stmt.period_end) if stmt.period_end else None,
        "matching_analysis_report": analysis,
    }


@router.get("/statements/{statement_id}/analysis")
async def get_statement_analysis(
    statement_id: uuid.UUID,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """Full Matching Analysis Report for one uploaded statement."""
    stmt = (
        await db.execute(
            select(BankStatement).where(
                BankStatement.id == statement_id,
                BankStatement.landlord_id == landlord.id,
            )
        )
    ).scalar_one_or_none()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    rows = await TrackerService.get_statement_analysis(db, landlord.id, statement_id=statement_id)
    return {
        "statement_id": str(stmt.id),
        "file_name": stmt.file_name,
        "period_start": str(stmt.period_start) if stmt.period_start else None,
        "period_end": str(stmt.period_end) if stmt.period_end else None,
        "matching_analysis_report": rows,
    }


@router.post("/approve-match")
async def approve_match_transaction(
    req: ApproveMatchRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a high-confidence (or reviewed) suggested match.
    This is the point at which the payment is persisted and the invoice updated.
    """
    try:
        match_obj = await TrackerService.approve_suggested_match(
            session=db,
            transaction_id=req.transaction_id,
            landlord_id=landlord.id,
            notes=req.notes,
        )
        return {
            "status": "success",
            "match_id": str(match_obj.id),
            "matched_amount": float(match_obj.matched_amount),
            "payment_id": str(match_obj.payment_id) if match_obj.payment_id else None,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/manual-match")
async def manual_match_transaction(
    req: ManualMatchRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually match or reassign a transaction to a tenant invoice.
    Persists payment and updates invoice/financial records.
    """
    try:
        match_obj = await TrackerService.confirm_manual_match(
            session=db,
            transaction_id=req.transaction_id,
            invoice_id=req.invoice_id,
            landlord_id=landlord.id,
            notes=req.notes
        )
        return {
            "status": "success",
            "match_id": str(match_obj.id),
            "matched_amount": float(match_obj.matched_amount),
            "payment_id": str(match_obj.payment_id) if match_obj.payment_id else None
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reject-match")
async def reject_match_transaction(
    req: RejectMatchRequest,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """
    Leave / dismiss a suggested match — transaction stays unmatched for later review.
    Does not create a payment.
    """
    txn_res = await db.execute(
        select(BankTransaction).where(
            BankTransaction.id == req.transaction_id,
            BankTransaction.landlord_id == landlord.id,
        )
    )
    txn = txn_res.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.matched_payment_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot dismiss a transaction that already has a confirmed payment.",
        )

    txn.matching_status = "UNMATCHED"
    # Keep suggestion metadata for audit but clear active suggestion linkage for UI clarity
    txn.confidence_score = txn.confidence_score or 0.0

    match_res = await db.execute(select(PaymentMatch).where(PaymentMatch.transaction_id == txn.id))
    match_obj = match_res.scalar_one_or_none()
    if match_obj and not match_obj.payment_id:
        match_obj.review_status = "REJECTED"
        match_obj.rejection_reason = req.reason or "Left unmatched by landlord"

    await db.commit()
    return {"status": "success", "message": "Transaction left unmatched for later review"}


@router.get("/statements")
async def list_statements(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """Lists bank statements uploaded by the landlord."""
    res = await db.execute(
        select(BankStatement).where(BankStatement.landlord_id == landlord.id).order_by(desc(BankStatement.created_at))
    )
    stmts = res.scalars().all()
    return [
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
            "notes": s.notes
        }
        for s in stmts
    ]


@router.get("/accounts")
async def list_bank_accounts(
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """Lists landlord's registered bank accounts."""
    res = await db.execute(
        select(BankAccount).where(BankAccount.landlord_id == landlord.id).order_by(desc(BankAccount.is_primary))
    )
    accs = res.scalars().all()
    return [
        {
            "id": str(a.id),
            "bank_name": a.bank_name,
            "account_name": a.account_name,
            "account_number": a.account_number,
            "currency": a.currency,
            "is_primary": a.is_primary
        }
        for a in accs
    ]


@router.post("/accounts")
async def create_bank_account(
    req: BankAccountCreate,
    landlord: LandlordProfile = Depends(get_current_landlord),
    db: AsyncSession = Depends(get_db)
):
    """Adds a new bank account profile for the landlord."""
    acc = BankAccount(
        landlord_id=landlord.id,
        bank_name=req.bank_name,
        account_name=req.account_name,
        account_number=req.account_number,
        currency=req.currency,
        is_primary=req.is_primary
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return {
        "id": str(acc.id),
        "bank_name": acc.bank_name,
        "account_name": acc.account_name,
        "account_number": acc.account_number,
        "currency": acc.currency,
        "is_primary": acc.is_primary
    }
