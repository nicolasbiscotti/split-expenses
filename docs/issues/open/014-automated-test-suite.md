# [TODO] Automated test suite

**Type:** todo
**Opened:** 2026-04-05

## Description

The codebase has no automated tests. Bugs like the Firestore rules regression (#013) and the pagination-broken balance calculation (#009) were caught manually during development. A test suite would catch regressions automatically after any change to the codebase.

## Proposed scope

### Layer 1 — Unit tests (pure logic, no I/O)

**`src/util/calculations.ts`**
- `calculateBalancesFromNetPaid`: verify balance formula for 2 and 3 participants, zero expenses, unequal contributions, payments
- `calculateDebts`: verify debt minimisation produces correct transfers, handles zero-balance participants, handles already-settled groups

These are pure functions with no dependencies — the easiest and highest-value tests to write.

### Layer 2 — Firestore security rules tests

**`firestore.rules`** tested against the local emulator using `@firebase/rules-unit-testing`.

Critical paths to cover:
- Creator can read/create/update/delete SE, expenses, payments
- Non-creator participant can read expenses and payments
- Non-creator participant can create expense (`paidByEmail == own email` or `creatorUid == own uid`)
- Non-creator participant can update SE with only aggregate fields (`totalAmount`, `expensesCount`, `netPaid`)
- Non-participant cannot read sub-collections
- Unauthenticated user cannot read anything
- Participant cannot update SE name, description, or participants array

### Layer 3 — Service layer integration tests (optional, higher effort)

**`src/services/databaseService.ts`** and **`src/store.ts`** tested against the Firestore emulator. Verifies that:
- `createExpense` transaction atomically updates `totalAmount`, `expensesCount`, `netPaid`
- `deleteExpense` transaction rolls back correctly if SE not found
- Pagination cursors return correct pages

## Proposed tooling

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner — already using Vite, natural fit, zero extra config |
| **`@firebase/rules-unit-testing`** | Firestore emulator + rules assertions |
| `vitest.config.ts` | Separate config or inline in `vite.config.ts` |

## Suggested implementation order

1. Add Vitest (`pnpm add -D vitest`)
2. Write unit tests for `calculations.ts` (immediate value, no infrastructure needed)
3. Add `@firebase/rules-unit-testing` and write rules tests (catches security regressions)
4. Add service-layer integration tests as needed

## Acceptance criteria

- [ ] `pnpm test` runs all tests without the dev server
- [ ] `calculateBalancesFromNetPaid` and `calculateDebts` are fully covered
- [ ] Firestore rules tests cover the critical permit/deny paths listed above
- [ ] Tests run in CI alongside `pnpm build`

## Related

- Bug caught manually that tests would have prevented: [#013](013-firestore-rules-missing-aggregate-fields.md)
- Bug caught manually that tests would have prevented: pagination-broken balances (#009)
