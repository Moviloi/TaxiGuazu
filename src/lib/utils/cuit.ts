/**
 * Validates an Argentine CUIT (Clave Única de Identificación Tributaria).
 *
 * CUIT format: XX-XXXXXXXX-X (11 digits total)
 * The last digit is a check digit calculated using the first 10 digits
 * with weights [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] modulo 11.
 *
 * @param cuit - The CUIT string to validate (accepts XX-XXXXXXXX-X or XXXXXXXXXXX).
 * @returns `true` if the CUIT is valid, `false` otherwise.
 *
 * @example
 * validateCUIT("30-12345678-9") // true
 * validateCUIT("30123456789")   // true
 * validateCUIT("00-00000000-0") // false
 */
export function validateCUIT(cuit: string): boolean {
  if (!cuit) return false;

  // Normalise: remove hyphens and whitespace
  const cleaned = cuit.replace(/[-\s]/g, "");

  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) return false;

  // Reject clearly invalid prefixes (all zeros or all same digit)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = cleaned.split("").map(Number);
  const checkDigit = digits[10];

  // Weighted sum of first 10 digits
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i];
  }

  const remainder = sum % 11;
  const expected = remainder === 0 ? 0 : remainder === 1 ? null : 11 - remainder;

  // If expected is null, the check digit would be 10 which is invalid in CUIT
  return expected === checkDigit;
}

/**
 * Formats a CUIT string into the standard XX-XXXXXXXX-X format.
 *
 * @param cuit - Raw CUIT (11 digits, with or without hyphens).
 * @returns Formatted CUIT or the original string if it can't be formatted.
 *
 * @example
 * formatCUIT("30123456789")   // "30-12345678-9"
 * formatCUIT("30-12345678-9") // "30-12345678-9"
 */
export function formatCUIT(cuit: string): string {
  const cleaned = cuit.replace(/[-\s]/g, "");
  if (!/^\d{11}$/.test(cleaned)) return cuit;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
}
