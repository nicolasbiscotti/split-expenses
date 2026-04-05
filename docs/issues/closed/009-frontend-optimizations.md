# [TODO] Frontend optimizations — bounded listeners, offline persistence, pagination

**Type:** todo
**Opened:** 2026-04-03
**Resolved:** 2026-04-05

## Context

Identified in `docs/shared-expenses-revised.md` (Frontend Optimization section) and surfaced during the analysis for #006. The bounded `onSnapshot` pattern is a hard prerequisite for the notification system (#010) — introducing unbounded listeners would burn Firestore quota and degrade performance. The other items are independent but cheap to apply at the same time.

## Items

### Item 1 — Bounded real-time listeners (prerequisite for #010)

Any `onSnapshot` call without a `limit()` reads the entire collection on every reconnect (network switches, app backgrounding). A single user with an unbounded listener on a 200-expense collection could generate 1,000+ reads/day.

**Pattern established:**
```typescript
const unsubExpenses = onSnapshot(
  query(
    collection(db, `.../expenses`),
    orderBy('date', 'desc'),
    limit(20)           // always bounded
  ),
  (snap) => {
    snap.docChanges().forEach((change) => {
      // handle added / modified / removed
    });
  }
);
```

`PAGE_SIZE = 3` constant exported from `databaseService.ts` (set to 3 for emulator testing; raise to 20 before production). All expense/payment queries use `limit(PAGE_SIZE + 1)`.

### Item 2 — Offline persistence

`src/firebase/config.ts` switched from `getFirestore()` to `initializeFirestore()` with `persistentLocalCache()`.

### Item 3 — Cursor-based pagination for expense/payment lists

`expenseService.getExpenses()` and `paymentService.getPayments()` use cursor-based pagination (`startAfter` + `limit(PAGE_SIZE + 1)`). `AppStore` tracks cursors and exposes `loadMoreExpenses()` / `loadMorePayments()`. "Cargar más" buttons added to history, expense form, and payment form views (see [#012](012-reuse-list-components-in-form-views.md)).

### Item 4 — Avoid redundant SE list reloads

`sharedExpenses` is loaded once in `initializeForUser()` and updated only after mutations — no per-view reload confirmed.

## Bug fix — dashboard aggregates broken by pagination

`calculateBalances`, `totalAmount`, and `expensesCount` were computed from in-memory records (first page only), producing wrong results when more records existed. Fixed by storing three aggregate fields on the SharedExpense document, updated atomically in Firestore transactions:

- `totalAmount` — already existed; dashboard now reads from SE doc instead of summing in-memory expenses
- `expensesCount` — incremented on `createExpense`, decremented on `deleteExpense`
- `netPaid: Record<string, number>` — running net contribution per participant; updated by all four mutations

`calculateBalances` replaced by `calculateBalancesFromNetPaid(participants, totalAmount, netPaid)` — correct regardless of pagination. `syncSharedExpenseTotal` removed (was also wrong with pagination).

Backfill script for existing data: `scripts/firebase-admin-sdk/backfill-aggregates.js`.

## Acceptance criteria

- [x] No unbounded `onSnapshot` or `getDocs` call exists on expense or payment collections
- [x] `PAGE_SIZE` constant is defined and used consistently
- [x] Offline persistence is enabled in `src/firebase/config.ts`
- [x] Expense/payment history view has a "load more" control
- [x] SE list is not re-fetched on every view navigation
- [x] Dashboard balances, total, and expense count are correct regardless of how many records are loaded

## Related

- Source analysis: [#006](006-shared-expenses-model-refactor.md)
- Extended by: [#012](012-reuse-list-components-in-form-views.md)
- Item 1 prerequisite for: [#010](../open/010-in-app-notification-system.md)
