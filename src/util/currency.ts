/**
 * Currency formatting utilities for Argentina (ARS)
 */

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ARS_FORMATTER_NO_SYMBOL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as Argentine Peso (ARS)
 * Example: 1234.56 -> "$ 1.234,56"
 */
export function formatCurrency(amount: number): string {
  return ARS_FORMATTER.format(amount);
}

/**
 * Format a number with Argentine number format (no currency symbol)
 * Example: 1234.56 -> "1.234,56"
 */
export function formatNumber(amount: number): string {
  return ARS_FORMATTER_NO_SYMBOL.format(amount);
}

/**
 * Format currency with sign indicator for balances
 * Positive: "+$ 1.234,56"
 * Negative: "-$ 1.234,56"
 * Zero: "$ 0,00"
 */
export function formatBalance(amount: number): string {
  if (amount > 0.01) {
    return `+${formatCurrency(amount)}`;
  } else if (amount < -0.01) {
    return formatCurrency(amount); // Intl already adds minus sign
  }
  return formatCurrency(0);
}

/**
 * Format currency for display in compact form (for cards/lists)
 * Example: 1234.56 -> "$ 1.234,56"
 */
export function formatCurrencyCompact(amount: number): string {
  return formatCurrency(amount);
}

/**
 * Parse a formatted currency string back to number
 * Example: "$ 1.234,56" -> 1234.56
 */
export function parseCurrency(formatted: string): number {
  // Remove currency symbol and spaces
  const cleaned = formatted
    .replace(/[$ ]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal separator
  
  return parseFloat(cleaned) || 0;
}
