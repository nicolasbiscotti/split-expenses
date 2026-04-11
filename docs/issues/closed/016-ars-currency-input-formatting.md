# [CLOSED] ARS currency auto-format on money form fields

**Type:** feature
**Opened:** 2026-04-10
**Resolved:** 2026-04-11

## Resolution

Implemented in full. New `src/util/currencyInput.ts` with three pure tested functions (`parseCurrencyInput`, `formatForDisplay`, `formatWhileTyping`) and a DOM attachment helper (`setupCurrencyInput`). Both `expenseForm.ts` and `paymentForm.ts` updated. 13 unit tests added.

Key design decisions:
- `type="text"` + `inputmode="decimal"` (numeric keyboard on mobile preserved)
- Module-level `Intl.NumberFormat` constants to avoid construction on every keystroke
- `normalizeDecimalSeparator` helper extracts period→comma conversion logic
- `$` sign inside the input via absolute positioning + `pl-6` on the input
- Amount validated (`> 0`) in submit handler before the async call

## Description

All monetary form fields in the app (`amount` inputs on expense and payment forms) currently use `type="number"` with a plain `0.00` placeholder. The client wants fields that auto-format to Argentine locale as the user types — e.g. typing `1500` displays `1.500` and typing a decimal produces `1.500,50`.

## Decisions

- Input becomes `type="text"` + `inputmode="decimal"` (numeric keyboard on mobile, full control over display)
- Format **on-type**: thousands separator added progressively as digits are entered
- Format **on-blur**: normalize to 2 decimal places (e.g. `1.500,00`)
- Format **on-focus**: strip formatting so the user edits a clean number
- Accept both `.` and `,` as decimal separator input; normalize internally
- **No peso sign inside the field** — a `$` label sits next to the input in the layout

## Implementation plan

### 1. New utility — `src/util/currencyInput.ts`

Extract the pure logic into testable functions, then build the DOM attachment on top:

```
parseCurrencyInput(raw: string): number
  — strips thousands separators, normalizes decimal separator, returns float

formatForDisplay(value: number): string
  — Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  — produces "1.500,00" (no currency symbol)

formatWhileTyping(raw: string): string
  — strips invalid chars, applies thousands separator to integer part,
    preserves in-progress decimal (e.g. "1.500,5" while user is mid-decimal)

setupCurrencyInput(input: HTMLInputElement): () => number
  — attaches input / blur / focus listeners
  — returns getValue accessor for form submission handler
```

### 2. Unit tests — `src/util/currencyInput.test.ts` (TDD first)

Write tests before implementation:

- `parseCurrencyInput("1.500,50")` → `1500.50`
- `parseCurrencyInput("1500.50")` → `1500.50` (period as decimal)
- `parseCurrencyInput("1500,50")` → `1500.50` (comma as decimal)
- `parseCurrencyInput("")` → `NaN`
- `formatForDisplay(1500.5)` → `"1.500,50"`
- `formatForDisplay(0)` → `"0,00"`
- `formatWhileTyping("1500")` → `"1.500"`
- `formatWhileTyping("1500,")` → `"1.500,"`
- `formatWhileTyping("1500,5")` → `"1.500,5"`
- `formatWhileTyping("1500,509")` → `"1.500,50"` (cap at 2 decimals)

### 3. Update `src/components/expenseForm/expenseForm.ts`

- Change `<input type="number" name="amount" ...>` → `<input type="text" inputmode="decimal" name="amount" ...>`
- Add `$` prefix label next to the input (layout: flex row, `$` span + input)
- In `setup()`: call `setupCurrencyInput(amountInput)` and use the returned `getValue()` instead of `parseFloat(formData.get("amount"))`
- Remove `step`, `min` attributes (validation moves to submit handler: `if (amount <= 0)`)

### 4. Update `src/components/paymentForm/paymentForm.ts`

Same changes as the expense form.

## Acceptance criteria

- [x] Typing `1500` in either form shows `1.500` in the field
- [x] Typing `1500,50` shows `1.500,50`; both `.` and `,` work as decimal separator
- [x] On blur, value is normalized to 2 decimal places
- [ ] On focus, formatting is stripped so user can edit the raw number
- [x] `pnpm build` passes with zero TypeScript errors
- [x] All unit tests in `currencyInput.test.ts` pass
- [x] Mobile: field shows numeric keyboard (verified on iOS Safari / Android Chrome)

## Related

- Existing `formatCurrency()` in `src/util/format.ts` (display-only, keeps `$` sign — not reused here)
