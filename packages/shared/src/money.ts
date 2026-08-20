/**
 * Money is ALWAYS an integer number of piasters (قرش). 100 piasters = 1 EGP.
 * Formatting uses Latin digits per the design system (docs/architecture/08 §2).
 */

export function poundsToPiasters(pounds: number): number {
  return Math.round(pounds * 100);
}

export function piastersToPounds(piasters: number): number {
  return piasters / 100;
}

/** 12550 → "125.50 جنيه", 12500 → "125 جنيه" */
export function formatMoney(piasters: number): string {
  const pounds = piasters / 100;
  const text = Number.isInteger(pounds) ? String(pounds) : pounds.toFixed(2);
  return `${text} جنيه`;
}
