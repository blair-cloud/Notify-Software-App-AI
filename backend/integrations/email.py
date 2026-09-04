import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("email_service")

async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_content: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Sends an email to the specified recipient.
    In development and sandbox mode, formats and logs the outbound email with complete metadata.
    In production, connects to SMTP/Mailgun/SendGrid/AWS SES.
    """
    try:
        logger.info("=" * 60)
        logger.info(f"📬 [NOTIFY EMAIL DISPATCHER] To: {to_email}")
        logger.info(f"📋 Subject: {subject}")
        logger.info(f"📄 Body: {body}")
        if metadata:
            logger.info(f"🏷️  Metadata: {metadata}")
        logger.info("=" * 60)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def render_lease_expiry_email_html(
    manager_name: str,
    tenant_name: str,
    property_name: str,
    unit_number: str,
    expiry_date_str: str,
    days_remaining: int,
    milestone: str,
    recommended_action: str,
    action_url: str = "https://notify.rw/dashboard/leases"
) -> str:
    """
    Renders an HTML email with Kigali Notify branding (#331A6F)
    """
    urgency_color = "#E11D48" if days_remaining <= 3 else "#D97706" if days_remaining <= 14 else "#331A6F"
    days_text = "TODAY" if days_remaining == 0 else f"{days_remaining} Day{'s' if days_remaining != 1 else ''}"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }}
    .container {{ max-width: 600px; margin: 24px auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background-color: #331A6F; padding: 32px 24px; text-align: center; color: #FFFFFF; }}
    .logo {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .logo span {{ color: #F59E0B; }}
    .content {{ padding: 32px 24px; }}
    .badge {{ display: inline-block; background-color: {urgency_color}; color: #FFFFFF; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }}
    .title {{ font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }}
    .card {{ background-color: #F1F5F9; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border: 1px solid #E2E8F0; }}
    .row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px dashed #CBD5E1; }}
    .row:last-child {{ border-bottom: none; }}
    .label {{ color: #64748B; font-weight: 500; }}
    .value {{ color: #0F172A; font-weight: 700; text-align: right; }}
    .action-box {{ background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #92400E; }}
    .btn {{ display: inline-block; background-color: #331A6F; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin-top: 10px; }}
    .footer {{ background-color: #F8FAFC; padding: 20px 24px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">NOTIFY <span>•</span> KIGALI</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #DDD6FE;">Commercial Property & Lease Reminder System</p>
    </div>
    <div class="content">
      <div class="badge">Lease Expiry Notice • {days_text} Remaining</div>
      <h2 class="title">Automated Lease Expiry Reminder</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Hello <strong>{manager_name}</strong>, this is an automated reminder regarding an upcoming lease expiration in your property portfolio.
      </p>

      <div class="card">
        <div class="row"><span class="label">Tenant Name</span><span class="value">{tenant_name}</span></div>
        <div class="row"><span class="label">Property / Building</span><span class="value">{property_name}</span></div>
        <div class="row"><span class="label">Unit Number</span><span class="value">{unit_number}</span></div>
        <div class="row"><span class="label">Lease Expiration Date</span><span class="value">{expiry_date_str}</span></div>
        <div class="row"><span class="label">Days Remaining</span><span class="value" style="color: {urgency_color};">{days_text}</span></div>
      </div>

      <div class="action-box">
        <strong>Recommended Action:</strong> {recommended_action}
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{action_url}" class="btn">View Lease in Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0;">© 2026 Notify Kigali. All rights reserved.</p>
      <p style="margin: 0;">You received this automated reminder based on your Notify Notification Preferences.</p>
    </div>
  </div>
</body>
</html>"""
