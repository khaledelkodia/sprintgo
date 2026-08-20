/**
 * Egyptian mobile normalization. Accepts what people actually type —
 * spaces, dashes, Arabic-Indic digits (٠١٢…), 0020/+20/20 prefixes —
 * and returns canonical E.164 (+201XXXXXXXXX) or null.
 */
const EG_LOCAL_MOBILE = /^01[0125][0-9]{8}$/;
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

export function normalizeEgyptianPhone(input: string): string | null {
  let digits = input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[^0-9+]/g, '');

  if (digits.startsWith('+20')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('0020')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('20') && digits.length === 12) digits = `0${digits.slice(2)}`;

  if (!EG_LOCAL_MOBILE.test(digits)) return null;
  return `+2${digits}`;
}

export function isValidEgyptianPhone(input: string): boolean {
  return normalizeEgyptianPhone(input) !== null;
}

/** "+201012345678" → "01012345678" for display */
export function displayPhone(e164: string): string {
  return e164.startsWith('+2') ? e164.slice(2) : e164;
}

/** "+201012345678" → "+2010****678" for logs/admin lists (docs/architecture/09 §4) */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return '****';
  return `${e164.slice(0, 5)}****${e164.slice(-3)}`;
}
