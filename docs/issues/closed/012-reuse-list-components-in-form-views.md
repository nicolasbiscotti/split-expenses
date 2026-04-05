# [TODO] Reuse expense and payment list components in form views

**Type:** todo
**Opened:** 2026-04-05
**Resolved:** 2026-04-05

## Description

The expense list and payment list were rendered only in the `history` view, with private
helper functions inside `history.ts`. The form views showed no transaction history,
forcing users to navigate away to check existing expenses or payments.

## Resolution

Extracted `renderExpenseItem`, `renderExpenseList`, and `setupExpenseList` into
`src/components/history/expenseList.ts`, and the payment equivalents into
`src/components/history/paymentList.ts` — following the same pattern as `debtList.ts`.

- `add-expense` view now shows the expense list below the form
- `add-payment` view now shows the payment list below the debt suggestions
- `history.ts` delegates to the extracted components (no duplication)
- `render.ts` calls the list setup functions for both form views

## Related

- Pattern source: `src/components/dashboard/debtList.ts` (already shared between dashboard and paymentForm)
- Preceded by: [#009](../open/009-frontend-optimizations.md) (pagination added the load-more controls now visible in form views too)
