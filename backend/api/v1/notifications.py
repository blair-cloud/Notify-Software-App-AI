import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import User
from backend.schemas.notification import (
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationDeliveryLogResponse,
    ProcessRemindersResult,
)
from backend.services.notification_service import NotificationService
from backend.integrations.email import send_email, render_lease_expiry_email_html

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    category: Optional[str] = Query(None, description="Filter by category (LEASE_EXPIRY, PAYMENT, MAINTENANCE, COMPLAINT, SYSTEM)"),
    priority: Optional[str] = Query(None, description="Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)"),
    unread_only: bool = Query(False, description="Filter by unread status"),
    search: Optional[str] = Query(None, description="Search keyword in title or message"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.get_user_notifications(
        db,
        user_id=current_user.id,
        category=category,
        priority=priority,
        unread_only=unread_only,
        search=search,
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification UUID format")
    
    notif = await NotificationService.mark_as_read(db, notif_uuid)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await NotificationService.mark_all_as_read(db, current_user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification UUID format")
    
    deleted = await NotificationService.delete_notification(db, notif_uuid, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification removed"}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = await NotificationService.get_or_create_preferences(db, current_user.id)
    return prefs


@router.put("/preferences", response_model=NotificationPreferencesResponse)
@router.patch("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    prefs_in: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = prefs_in.model_dump(exclude_unset=True)
    updated = await NotificationService.update_preferences(db, current_user.id, data)
    return updated


@router.post("/process-reminders", response_model=ProcessRemindersResult)
async def trigger_process_reminders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers automated scan for leases expiring in 30, 14, 7, 3, 2, 1, and 0 days,
    updates lease statuses, creates notifications, and sends emails based on preferences.
    """
    result = await NotificationService.process_automated_reminders(db)
    return result


@router.get("/logs", response_model=List[NotificationDeliveryLogResponse])
async def get_notification_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.get_delivery_logs(db, current_user.id)


@router.get("/templates")
async def get_notification_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.get_templates(db)


@router.post("/test-email")
async def send_test_email(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recipient = payload.get("email") or current_user.email or "manager@notify.rw"
    days_remaining = payload.get("days_remaining", 7)
    tenant_name = payload.get("tenant_name", "Jean Paul Habimana")
    property_name = payload.get("property_name", "Notify Heights Commercial")
    unit_number = payload.get("unit_number", "Unit 402 - Level 4")
    
    html = render_lease_expiry_email_html(
        manager_name=f"{current_user.first_name} {current_user.last_name}".strip() or "Property Manager",
        tenant_name=tenant_name,
        property_name=property_name,
        unit_number=unit_number,
        expiry_date_str="March 20, 2026",
        days_remaining=days_remaining,
        milestone=f"{days_remaining}D",
        recommended_action="Confirm signing of lease extension or prepare move-out inspection checklist.",
    )
    
    sent = await send_email(
        to_email=recipient,
        subject=f"[Test Notification] Lease Expiring in {days_remaining} Days: {unit_number}",
        body=f"Test reminder: Lease for {tenant_name} in {unit_number} at {property_name} expires in {days_remaining} days.",
        html_content=html,
    )
    
    return {"status": "success" if sent else "failed", "recipient": recipient}
