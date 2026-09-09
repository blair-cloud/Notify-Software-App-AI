/**
 * WhatsApp integration utilities for Landlord actions.
 */

/**
 * Clean and format a phone number to standard international format without '+' or non-digit chars
 * e.g. "+250 788 123 456" -> "250788123456"
 * "0788123456" -> "250788123456" (if 10-digit Rwandan number starting with 07)
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  // Normalize Rwandan local format 07... -> 2507...
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    cleaned = '250' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Open WhatsApp directly with a prefilled message to a phone number.
 * Works seamlessly on Web, Desktop, iOS, and Android.
 */
export function openWhatsApp(phone: string, text: string): void {
  const cleanNumber = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Build prefilled WhatsApp message for tenant invitation.
 */
export function buildInvitationWhatsAppMessage(params: {
  tenantName?: string;
  propertyName?: string;
  unitNumber?: string;
  inviteLink: string;
}): string {
  const name = params.tenantName ? `Hello ${params.tenantName}, ` : 'Hello, ';
  const propertyInfo = params.propertyName
    ? params.unitNumber
      ? `to Unit ${params.unitNumber} at ${params.propertyName}`
      : `to ${params.propertyName}`
    : 'as a tenant';

  return `${name}you have been invited on Notify ${propertyInfo}.\n\nPlease complete your tenant registration using the link below:\n${params.inviteLink}\n\n(This invitation link expires in 7 days).`;
}

/**
 * Build customized WhatsApp message for reminder with placeholder substitutions.
 */
export function buildReminderWhatsAppMessage(params: {
  templateBody: string;
  tenantName: string;
  unitNumber?: string;
  propertyName?: string;
  amount?: string;
  dueDate?: string;
  invoiceNumber?: string;
}): string {
  let text = params.templateBody || '';
  text = text.replace(/\{\{\s*tenant_name\s*\}\}/gi, params.tenantName || 'Tenant');
  text = text.replace(/\{\{\s*unit_number\s*\}\}/gi, params.unitNumber || '');
  text = text.replace(/\{\{\s*property_name\s*\}\}/gi, params.propertyName || '');
  text = text.replace(/\{\{\s*amount\s*\}\}/gi, params.amount || '');
  text = text.replace(/\{\{\s*due_date\s*\}\}/gi, params.dueDate || '');
  text = text.replace(/\{\{\s*invoice_number\s*\}\}/gi, params.invoiceNumber || '');
  return text;
}
