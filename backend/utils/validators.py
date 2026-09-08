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


COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789", "qwerty123",
    "letmein1", "welcome1", "admin123", "notify123", "iloveyou", "abc12345",
}


def validate_password_strength(password: str) -> str:
    """
    Enforce a minimum password quality on every path that sets one: sign up,
    reset and change. Returns the password so callers can inline the check.

    The rules are deliberately explainable, because the message goes straight
    to the user.
    """
    if not password or len(password) < 8:
        raise NotifyException("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise NotifyException("Password must be 128 characters or fewer.")
    if password.lower() in COMMON_PASSWORDS:
        raise NotifyException("That password is too common. Please choose a less predictable one.")
    if not re.search(r"[A-Za-z]", password):
        raise NotifyException("Password must contain at least one letter.")
    if not re.search(r"\d", password):
        raise NotifyException("Password must contain at least one number.")
    return password


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")


def validate_email_address(email: str) -> str:
    """Normalise and sanity-check an email address."""
    cleaned = (email or "").strip().lower()
    if not EMAIL_RE.match(cleaned):
        raise NotifyException("Please enter a valid email address.")
    return cleaned


def split_full_name(full_name: str) -> tuple[str, str]:
    """
    Split a single display name into first/last.

    The sign-up form collects one 'Full name' field, so the API accepts that
    shape as well as explicit first/last names.
    """
    parts = [p for p in (full_name or "").strip().split() if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])
