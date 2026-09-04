import re
from backend.core.exceptions import NotifyException

def validate_rwanda_phone(phone: str) -> str:
    cleaned = re.sub(r'[\s\-\+]', '', phone)
    if cleaned.startswith('250') and len(cleaned) == 12:
        return f"+{cleaned}"
    elif cleaned.startswith('0') and len(cleaned) == 10:
        return f"+250{cleaned[1:]}"
    elif len(cleaned) == 9 and cleaned.startswith('7'):
        return f"+250{cleaned}"
    raise NotifyException("Invalid phone number format. Must be a valid phone number (e.g., +25078XXXXXXX)")
