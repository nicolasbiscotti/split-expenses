# [TODO] Rename adminUid → creatorUid and payerEmail → paidByEmail

**Type:** todo
**Opened:** 2026-04-03

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

- Source analysis: [#006](../closed/006-shared-expenses-model-refactor.md)
- Depends on: [#007](007-fix-firestore-rules-security-bugs.md) (rules must be correct before field names change)
- Must be completed before: [#010](010-in-app-notification-system.md)
