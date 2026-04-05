# [TODO] Rename adminUid → creatorUid and payerEmail → paidByEmail

**Type:** todo
**Opened:** 2026-04-03
**Resolved:** 2026-04-03

## Context

Identified during the analysis for #006 as Track A — low-effort renames that align the codebase with the `shared-expenses-revised.md` proposal. Field names must be finalized before the notification listener code (#010) is written, so listeners use the correct names from day one.

## Changes required

### Code changes (mechanical search-and-replace)

| From | To | Files |
|---|---|---|
| `Expense.adminUid` | `Expense.creatorUid` | `src/types/index.ts`, `src/store.ts`, `src/services/databaseService.ts`, `firestore.rules`, and any component rendering or reading expenses |
| `Payment.adminUid` | `Payment.creatorUid` | Same set |
| `Expense.payerEmail` | `Expense.paidByEmail` | `src/types/index.ts`, `src/store.ts`, `src/services/databaseService.ts`, `src/util/calculations.ts`, and any component rendering or reading expenses |

No logic changes — only identifier renames. TypeScript strict mode will surface every missed call site at compile time.

### Data migration

All existing Firestore expense and payment documents retain the old field names. A migration script must:
1. Read each expense document under every SE.
2. Copy `adminUid` → `creatorUid` and delete `adminUid`.
3. Copy `payerEmail` → `paidByEmail` and delete `payerEmail` (expenses only).
4. Write back atomically.

Extend `scripts/firebase-admin-sdk/migrate.js` or write a focused `rename-fields.js` script. Always run against the emulator first with `--dry-run`.

## Acceptance criteria

- [ ] `adminUid` does not appear anywhere in `src/` or `firestore.rules`
- [ ] `payerEmail` does not appear anywhere in `src/` or `firestore.rules`
- [ ] `pnpm build` passes with zero TypeScript errors
- [ ] Migration script tested on emulator before running against production data

## Related

- Source analysis: [#006](006-shared-expenses-model-refactor.md)
- Depends on: [#007](007-fix-firestore-rules-security-bugs.md)
- Must be completed before: [#010](../open/010-in-app-notification-system.md)

## Resolution

All renames applied across `src/types/index.ts`, `src/store.ts`, `src/services/databaseService.ts`, `src/util/calculations.ts`, `src/components/expenseForm/expenseForm.ts`, `src/components/history/history.ts`, and `firestore.rules`. Build passes with zero TypeScript errors and no remaining occurrences of the old field names.

Data migration handled by `scripts/firebase-admin-sdk/rename-fields.js` — a new focused script (no mapping file required) that reads a backup JSON, renames the fields, converts numeric-keyed array objects to real arrays, and writes back via batched commits (500 ops/batch).

Also fixed a related bug discovered during this work: the `createExpense` transaction in `databaseService.ts` was calling `updateDoc`/`addDoc` outside the transaction object, causing `totalAmount` to update even when the expense write was rejected by security rules. Replaced with proper `transaction.get`/`transaction.update`/`transaction.set` calls so both writes are truly atomic.
