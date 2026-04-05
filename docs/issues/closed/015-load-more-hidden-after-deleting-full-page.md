# [BUG] "Cargar más" button disappears after deleting all documents on the current page

**Type:** bug
**Opened:** 2026-04-05
**Resolved:** 2026-04-05

## Description

If the user deletes every document visible on the current page, the "Cargar más gastos" / "Cargar más pagos" button disappears even when more documents exist in Firestore (`hasMore === true`). The empty-state message "No hay gastos registrados" is shown instead, giving the false impression that the group has no records.

## Root cause

`renderExpenseList` (and `renderPaymentList`) use a simple ternary that switches entirely to the empty-state branch when `expenses.length === 0`, without checking `hasMore`:

```typescript
expenses.length === 0
  ? '<p class="text-gray-500">No hay gastos registrados</p>'
  : `
    <div class="space-y-2">...</div>
    ${hasMore ? `<button id="load-more-expenses">Cargar más gastos</button>` : ""}
  `
```

When all in-memory expenses are deleted, `expenses.length === 0` is true so the empty-state branch is taken, regardless of `hasMore`. The "Cargar más" button is never rendered.

## Fix (Option B — auto-load next page)

In `store.deleteExpense` and `store.deletePayment`, after removing the item from the in-memory array, if the array is now empty and `hasMoreExpenses`/`hasMorePayments` is still true, `loadMoreExpenses()`/`loadMorePayments()` is called automatically before the render cycle:

```typescript
// store.deleteExpense
this.expenses = this.expenses.filter((e) => e.id !== id);
this.patchLocalSE(sharedExpenseId, { totalAmount, expensesCount, netPaid });
if (this.expenses.length === 0 && this.hasMoreExpenses) {
  await this.loadMoreExpenses();
}

// store.deletePayment
this.payments = this.payments.filter((p) => p.id !== id);
this.patchLocalSE(sharedExpenseId, { netPaid });
if (this.payments.length === 0 && this.hasMorePayments) {
  await this.loadMorePayments();
}
```

The next page is fetched before the `finally` re-render, so the user sees the next page immediately with no empty-state flash and no extra click.

## Resolution

- **File changed:** `src/store.ts`
- Added auto-load check in `deleteExpense` and `deletePayment` after filtering the in-memory array.

## Acceptance criteria

- [x] Deleting all documents on the current page while `hasMore === true` does not show "No hay gastos registrados"
- [x] The user can still load the next page after deleting all documents from the current one
- [x] "No hay gastos registrados" only appears when there are truly no documents left (both in-memory array is empty AND `hasMore === false`)

## Related

- Affects: `src/store.ts`
- Render components: `src/components/history/expenseList.ts`, `src/components/history/paymentList.ts`
