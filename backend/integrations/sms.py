from backend.core.logging import logger

async def send_sms(phone: str, message: str) -> bool:
    logger.info(f"[SMS SERVICE] Sending SMS to {phone} | Content: {message}")
    # In production, integrates with Twilio or Africa's Talking
    return True
