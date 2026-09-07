/**
 * Technician trades. The codes are the values the API accepts
 * (backend WorkerSpecialization); the labels are what people read.
 */
export const WORKER_SPECIALIZATIONS: { code: string; label: string }[] = [
  { code: 'PLUMBER', label: 'Plumbing & Pipes' },
  { code: 'ELECTRICIAN', label: 'Electrical & Wiring' },
  { code: 'HVAC', label: 'Air Conditioning & HVAC' },
  { code: 'LOCKSMITH', label: 'Locksmith & Security' },
  { code: 'CARPENTER', label: 'Carpentry & Structural' },
  { code: 'PAINTER', label: 'Painting & Masonry' },
  { code: 'CLEANER', label: 'Cleaning & Sanitation' },
  { code: 'SECURITY', label: 'Security & Guarding' },
  { code: 'GENERAL', label: 'General Maintenance' },
  { code: 'OTHER', label: 'Other' },
];

const LABELS: Record<string, string> = WORKER_SPECIALIZATIONS.reduce(
  (acc, item) => ({ ...acc, [item.code]: item.label }),
  {} as Record<string, string>
);

/** Human label for a stored code, tolerant of legacy or unknown values. */
export const specializationLabel = (code?: string): string => {
  if (!code) return 'General Maintenance';
  return LABELS[code.toUpperCase()] || code;
};
