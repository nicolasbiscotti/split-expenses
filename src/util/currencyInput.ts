const INTEGER_FORMATTER = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const DISPLAY_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts a trailing period to a comma when it looks like a decimal separator
 * (0–2 digits after it and no comma already present).
 * Leaves the string unchanged otherwise.
 */
function normalizeDecimalSeparator(raw: string): string {
  if (raw.includes(",")) return raw;
  const lastPeriodIdx = raw.lastIndexOf(".");
  if (lastPeriodIdx === -1) return raw;
  const afterPeriod = raw.slice(lastPeriodIdx + 1);
  if (afterPeriod.length <= 2) {
    return raw.slice(0, lastPeriodIdx) + "," + afterPeriod;
  }
  return raw;
}

/**
 * Parses a currency string in es-AR format (or compatible variants) to a float.
 *
 * Disambiguation rules:
 *  - Both "." and "," present → period=thousands, comma=decimal (es-AR)
 *  - Only "," → decimal separator
 *  - Only "." → check digits after it: exactly 3 = thousands sep; otherwise decimal sep
 */
export function parseCurrencyInput(raw: string): number {
  if (!raw || raw.trim() === "") return NaN;

  const hasComma = raw.includes(",");
  const hasPeriod = raw.includes(".");

  if (hasComma && hasPeriod) {
    return parseFloat(raw.replace(/\./g, "").replace(",", "."));
  }

  if (hasComma) {
    return parseFloat(raw.replace(",", "."));
  }

  if (hasPeriod) {
    const afterPeriod = raw.slice(raw.lastIndexOf(".") + 1);
    if (afterPeriod.length === 3) {
      // e.g. "1.500" → thousands separator → 1500
      return parseFloat(raw.replace(/\./g, ""));
    }
    // e.g. "1500.50" → decimal separator
    return parseFloat(raw);
  }

  return parseFloat(raw);
}

/**
 * Formats a number in es-AR locale with exactly 2 decimal places.
 * Does not include the currency symbol.
 * Example: 1500.5 → "1.500,50"
 */
export function formatForDisplay(value: number): string {
  return DISPLAY_FORMATTER.format(value);
}

/**
 * Progressively formats a partially-typed currency string.
 * Adds thousands separators to the integer part; preserves an in-progress decimal.
 * Accepts both "," and "." as decimal separator input.
 * Caps the decimal part at 2 digits.
 *
 * Examples:
 *   "1500"     → "1.500"
 *   "1500,"    → "1.500,"
 *   "1500,5"   → "1.500,5"
 *   "1500,509" → "1.500,50"
 *   "1.5000"   → "15.000"   (previously formatted "1.500" + new digit "0")
 *   "1.500."   → "1.500,"   (user typed "." intending decimal)
 */
export function formatWhileTyping(raw: string): string {
  if (raw === "") return "";

  const normalized = normalizeDecimalSeparator(raw);

  // Strip all periods — now only thousands separators remain
  const stripped = normalized.replace(/\./g, "");

  const commaIdx = stripped.indexOf(",");
  const hasDecimal = commaIdx !== -1;
  const intDigits = (
    hasDecimal ? stripped.slice(0, commaIdx) : stripped
  ).replace(/\D/g, "");
  const decDigits = hasDecimal
    ? stripped.slice(commaIdx + 1).replace(/\D/g, "").slice(0, 2)
    : "";

  const formattedInt =
    intDigits === ""
      ? ""
      : INTEGER_FORMATTER.format(parseInt(intDigits, 10));

  return hasDecimal ? formattedInt + "," + decDigits : formattedInt;
}

/**
 * Attaches format-on-type currency behavior to a text input element.
 * The input must already be type="text" inputmode="decimal" in the template.
 *
 * - On input: formats progressively, cursor stays at end.
 * - On blur: normalizes to full 2-decimal display format.
 *
 * Returns a getValue function that reads the current numeric value from the
 * input — use this in form submit handlers instead of parseFloat(formData.get(...)).
 */
export function setupCurrencyInput(input: HTMLInputElement): () => number {
  input.addEventListener("input", () => {
    const formatted = formatWhileTyping(input.value);
    input.value = formatted;
    input.setSelectionRange(formatted.length, formatted.length);
  });

  input.addEventListener("blur", () => {
    const num = parseCurrencyInput(input.value);
    if (!isNaN(num)) {
      input.value = formatForDisplay(num);
    }
  });

  return () => parseCurrencyInput(input.value);
}
