"""
Reminder wording in the three languages Notify serves: English, French and
Kinyarwanda.

Two layers, in order of preference:

1. `REMINDER_TEMPLATES` - hand-written wording per reminder type per language.
   Deterministic, offline, and phrased for rent/lease context, so the common
   reminders never depend on a translation service being reachable.
2. `translate_text` - optional machine translation (LibreTranslate) for free
   text the landlord typed themselves. When no provider is configured it
   returns None rather than guessing, and the caller tells the landlord the
   text needs manual editing.

Either way the landlord reviews and can edit every language before sending.
"""
from typing import Any, Dict, List, Optional

import httpx

from backend.core.config import settings
from backend.core.logging import logger

SUPPORTED_LANGUAGES = ["EN", "FR", "RW"]

LANGUAGE_LABELS = {
    "EN": "English",
    "FR": "Français",
    "RW": "Kinyarwanda",
}

# LibreTranslate has no Kinyarwanda model; requests for it fall back to source.
_MT_CODES = {"EN": "en", "FR": "fr"}


def normalize_language(value: Optional[str]) -> str:
    """Map assorted spellings (en, ENG, fr-FR, kiny, rw) onto EN / FR / RW."""
    if not value:
        return "EN"
    token = str(value).strip().upper().replace("-", "_").split("_")[0]
    if token in ("RW", "KIN", "KINY", "KINYARWANDA"):
        return "RW"
    if token in ("FR", "FRE", "FRA", "FRENCH", "FRANCAIS"):
        return "FR"
    return "EN"


REMINDER_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "RENT_DUE_7D": {
        "label": "Rent due in 7 days",
        "category": "RENT_DUE",
        "priority": "MEDIUM",
        "title": {
            "EN": "Rent reminder: {{unit_number}}",
            "FR": "Rappel de loyer : {{unit_number}}",
            "RW": "Kwibutsa ubukode: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, your rent of {{currency}} {{amount}} for Unit {{unit_number}} at {{property_name}} is due on {{due_date}} (in 7 days). You can pay through the Notify portal, MoMo or bank transfer. Thank you.",
            "FR": "Cher/Chère {{tenant_name}}, votre loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} à {{property_name}} est dû le {{due_date}} (dans 7 jours). Vous pouvez payer via le portail Notify, MoMo ou virement bancaire. Merci.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} muri {{property_name}} bugomba kwishyurwa ku itariki {{due_date}} (mu minsi 7). Mushobora kwishyura kuri Notify, kuri MoMo cyangwa muri banki. Murakoze.",
        },
    },
    "RENT_DUE_3D": {
        "label": "Rent due in 3 days",
        "category": "RENT_DUE",
        "priority": "HIGH",
        "title": {
            "EN": "Rent due in 3 days: {{unit_number}}",
            "FR": "Loyer dû dans 3 jours : {{unit_number}}",
            "RW": "Ubukode bugomba kwishyurwa mu minsi 3: {{unit_number}}",
        },
        "body": {
            "EN": "Hello {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is due in 3 days, on {{due_date}}. Please arrange payment in good time. Thank you.",
            "FR": "Bonjour {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} est dû dans 3 jours, le {{due_date}}. Merci d'effectuer le paiement à temps.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bugomba kwishyurwa mu minsi 3, ku itariki {{due_date}}. Mwakwitegura kwishyura ku gihe. Murakoze.",
        },
    },
    "RENT_DUE_1D": {
        "label": "Rent due tomorrow",
        "category": "RENT_DUE",
        "priority": "HIGH",
        "title": {
            "EN": "Rent due tomorrow: {{unit_number}}",
            "FR": "Loyer dû demain : {{unit_number}}",
            "RW": "Ubukode bwishyurwa ejo: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, your rent payment of {{currency}} {{amount}} for Unit {{unit_number}} is due tomorrow, {{due_date}}. Please complete your payment to avoid late fees.",
            "FR": "Cher/Chère {{tenant_name}}, votre loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} est dû demain, le {{due_date}}. Merci de payer pour éviter des pénalités de retard.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bugomba kwishyurwa ejo, ku itariki {{due_date}}. Mwishyure kugira ngo mwirinde ihazabu yo gutinda.",
        },
    },
    "RENT_DUE_TODAY": {
        "label": "Rent due today",
        "category": "RENT_DUE",
        "priority": "CRITICAL",
        "title": {
            "EN": "Rent due today: {{unit_number}}",
            "FR": "Loyer dû aujourd'hui : {{unit_number}}",
            "RW": "Ubukode bwishyurwa uyu munsi: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is due today, {{due_date}}. Please complete payment today to avoid late fees.",
            "FR": "Cher/Chère {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} est dû aujourd'hui, le {{due_date}}. Merci de régler aujourd'hui pour éviter des pénalités.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bugomba kwishyurwa uyu munsi, ku itariki {{due_date}}. Mwishyure uyu munsi kugira ngo mwirinde ihazabu.",
        },
    },
    "RENT_OVERDUE_1D": {
        "label": "Rent 1 day overdue",
        "category": "RENT_DUE",
        "priority": "HIGH",
        "title": {
            "EN": "Overdue rent: {{unit_number}}",
            "FR": "Loyer en retard : {{unit_number}}",
            "RW": "Ubukode butarishyuwe: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, our records show rent of {{currency}} {{amount}} for Unit {{unit_number}} at {{property_name}} is now 1 day overdue (due {{due_date}}). Please settle it as soon as possible.",
            "FR": "Cher/Chère {{tenant_name}}, nos registres indiquent que le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} à {{property_name}} a 1 jour de retard (échéance {{due_date}}). Merci de régler dès que possible.",
            "RW": "Muraho {{tenant_name}}, twabonye ko ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} muri {{property_name}} bumaze umunsi 1 butishyuwe (bwagombaga kwishyurwa {{due_date}}). Mwishyure vuba bishoboka.",
        },
    },
    "RENT_OVERDUE_3D": {
        "label": "Rent 3 days overdue",
        "category": "RENT_DUE",
        "priority": "CRITICAL",
        "title": {
            "EN": "Second notice - overdue rent: {{unit_number}}",
            "FR": "Deuxième avis - loyer en retard : {{unit_number}}",
            "RW": "Itangazo rya kabiri - ubukode butarishyuwe: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is 3 days overdue. Please pay today or contact property management to agree on a plan.",
            "FR": "Cher/Chère {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} a 3 jours de retard. Merci de payer aujourd'hui ou de contacter la gestion pour convenir d'un arrangement.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bumaze iminsi 3 butishyuwe. Mwishyure uyu munsi cyangwa muvugane n'ubuyobozi kugira ngo mufate gahunda.",
        },
    },
    "RENT_OVERDUE_7D": {
        "label": "Rent 7 days overdue",
        "category": "RENT_DUE",
        "priority": "CRITICAL",
        "title": {
            "EN": "Final notice - overdue rent: {{unit_number}}",
            "FR": "Avis final - loyer en retard : {{unit_number}}",
            "RW": "Itangazo rya nyuma - ubukode butarishyuwe: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, rent of {{currency}} {{amount}} for Unit {{unit_number}} is now 7 days overdue and a late fee may be applied. Please settle the balance or contact property management immediately.",
            "FR": "Cher/Chère {{tenant_name}}, le loyer de {{currency}} {{amount}} pour l'unité {{unit_number}} a 7 jours de retard et des pénalités peuvent s'appliquer. Merci de régler le solde ou de contacter la gestion immédiatement.",
            "RW": "Muraho {{tenant_name}}, ubukode bwa {{currency}} {{amount}} bw'inzu {{unit_number}} bumaze iminsi 7 butishyuwe, kandi hashobora kongerwaho ihazabu. Mwishyure cyangwa muhite muvugana n'ubuyobozi.",
        },
    },
    "LEASE_EXPIRY_30D": {
        "label": "Lease expiring in 30 days",
        "category": "LEASE_EXPIRY",
        "priority": "MEDIUM",
        "title": {
            "EN": "Lease expiring soon: {{unit_number}}",
            "FR": "Bail bientôt expiré : {{unit_number}}",
            "RW": "Amasezerano y'ubukode agiye kurangira: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, your lease for Unit {{unit_number}} at {{property_name}} ends on {{end_date}} (in 30 days). Please let us know whether you intend to renew.",
            "FR": "Cher/Chère {{tenant_name}}, votre bail pour l'unité {{unit_number}} à {{property_name}} se termine le {{end_date}} (dans 30 jours). Merci de nous indiquer si vous souhaitez le renouveler.",
            "RW": "Muraho {{tenant_name}}, amasezerano y'ubukode bw'inzu {{unit_number}} muri {{property_name}} arangira ku itariki {{end_date}} (mu minsi 30). Mutumenyeshe niba mwifuza kuyavugurura.",
        },
    },
    "LEASE_EXPIRY_7D": {
        "label": "Lease expiring in 7 days",
        "category": "LEASE_EXPIRY",
        "priority": "HIGH",
        "title": {
            "EN": "Lease ends in 7 days: {{unit_number}}",
            "FR": "Bail expirant dans 7 jours : {{unit_number}}",
            "RW": "Amasezerano arangira mu minsi 7: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, your lease for Unit {{unit_number}} ends on {{end_date}}, in 7 days. Please contact property management to confirm renewal or arrange handover.",
            "FR": "Cher/Chère {{tenant_name}}, votre bail pour l'unité {{unit_number}} se termine le {{end_date}}, dans 7 jours. Merci de contacter la gestion pour confirmer le renouvellement ou organiser la remise des clés.",
            "RW": "Muraho {{tenant_name}}, amasezerano y'ubukode bw'inzu {{unit_number}} arangira ku itariki {{end_date}}, mu minsi 7. Muvugane n'ubuyobozi kugira ngo mwemeze kuyavugurura cyangwa mutegure gusubiza urufunguzo.",
        },
    },
    "MAINTENANCE_UPDATE": {
        "label": "Maintenance update",
        "category": "MAINTENANCE",
        "priority": "MEDIUM",
        "title": {
            "EN": "Maintenance update: {{unit_number}}",
            "FR": "Mise à jour de maintenance : {{unit_number}}",
            "RW": "Amakuru ku bisanwa: {{unit_number}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, this is an update regarding maintenance at Unit {{unit_number}}, {{property_name}}. {{custom_note}}",
            "FR": "Cher/Chère {{tenant_name}}, voici une mise à jour concernant la maintenance de l'unité {{unit_number}}, {{property_name}}. {{custom_note}}",
            "RW": "Muraho {{tenant_name}}, aya ni amakuru ku bijyanye n'ibisanwa mu nzu {{unit_number}}, {{property_name}}. {{custom_note}}",
        },
    },
    "GENERAL_ANNOUNCEMENT": {
        "label": "General announcement",
        "category": "SYSTEM",
        "priority": "MEDIUM",
        "title": {
            "EN": "Message from {{property_name}}",
            "FR": "Message de {{property_name}}",
            "RW": "Ubutumwa buturuka {{property_name}}",
        },
        "body": {
            "EN": "Dear {{tenant_name}}, {{custom_note}}",
            "FR": "Cher/Chère {{tenant_name}}, {{custom_note}}",
            "RW": "Muraho {{tenant_name}}, {{custom_note}}",
        },
    },
    "CUSTOM": {
        "label": "Custom message",
        "category": "SYSTEM",
        "priority": "MEDIUM",
        "title": {
            "EN": "Message from {{property_name}}",
            "FR": "Message de {{property_name}}",
            "RW": "Ubutumwa buturuka {{property_name}}",
        },
        "body": {
            "EN": "{{custom_note}}",
            "FR": "{{custom_note}}",
            "RW": "{{custom_note}}",
        },
    },
}


def render_placeholders(text: str, variables: Dict[str, Any]) -> str:
    """Replace {{name}} tokens, leaving nothing dangling when a value is absent."""
    if not text:
        return ""
    rendered = text
    for key, value in (variables or {}).items():
        rendered = rendered.replace(f"{{{{{key}}}}}", "" if value is None else str(value))
    # Drop any placeholder the caller did not supply rather than showing braces.
    while "{{" in rendered and "}}" in rendered:
        start = rendered.index("{{")
        end = rendered.index("}}", start)
        rendered = rendered[:start] + rendered[end + 2:]
    return " ".join(rendered.split()).strip()


def list_templates() -> List[Dict[str, Any]]:
    return [
        {
            "code": code,
            "label": tpl["label"],
            "category": tpl["category"],
            "priority": tpl["priority"],
            "title": tpl["title"],
            "body": tpl["body"],
        }
        for code, tpl in REMINDER_TEMPLATES.items()
    ]


def build_template_messages(code: str, variables: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
    """Render one template into all three languages, ready for landlord review."""
    tpl = REMINDER_TEMPLATES.get(code) or REMINDER_TEMPLATES["CUSTOM"]
    return {
        lang: {
            "title": render_placeholders(tpl["title"].get(lang, tpl["title"]["EN"]), variables),
            "body": render_placeholders(tpl["body"].get(lang, tpl["body"]["EN"]), variables),
        }
        for lang in SUPPORTED_LANGUAGES
    }


async def translate_text(text: str, target_language: str, source_language: str = "EN") -> Optional[str]:
    """
    Machine-translate free text. Returns None when translation is unavailable
    (no provider configured, unsupported language pair, or provider error) so
    the caller can ask the landlord to write that language themselves.
    """
    target = normalize_language(target_language)
    source = normalize_language(source_language)
    if not text or not text.strip() or target == source:
        return None

    provider = (settings.TRANSLATION_PROVIDER or "").lower()
    if provider != "libretranslate":
        return None
    if target not in _MT_CODES or source not in _MT_CODES:
        return None  # Kinyarwanda is not offered by this provider.

    payload = {
        "q": text,
        "source": _MT_CODES[source],
        "target": _MT_CODES[target],
        "format": "text",
    }
    if settings.LIBRETRANSLATE_API_KEY:
        payload["api_key"] = settings.LIBRETRANSLATE_API_KEY

    try:
        async with httpx.AsyncClient(timeout=settings.DELIVERY_TIMEOUT_SECONDS) as client:
            response = await client.post(settings.LIBRETRANSLATE_URL, json=payload)
        if response.status_code >= 400:
            logger.warning(f"Translation provider returned {response.status_code}: {response.text[:200]}")
            return None
        translated = (response.json() or {}).get("translatedText")
        return translated or None
    except Exception as exc:
        logger.warning(f"Translation failed ({source}->{target}): {exc}")
        return None
