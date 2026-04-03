# [TODO] Refactor participants from array to map

**Type:** todo
**Opened:** 2026-04-03

## Context

Track B from the #006 analysis — deferred until after the notification system (#010) ships. The current `participants` array works correctly. This refactor pays off as the app grows to need role-based permissions or custom splits.

## Current shape

```typescript
// SharedExpense.participants today
participants: Array<{
  email: string;
  displayName: string;
  uid?: string;
}>
```

## Proposed shape

```typescript
// SharedExpense.participants after refactor
participants: {
  [email: string]: {
    displayName: string;
    uid: string | null;
    role: "creator" | "member";
    addedAt: Timestamp;
  }
}
```

## Why

- **Deduplication by key**: impossible to add the same email twice by accident.
- **O(1) lookup**: `participants[email]` instead of `.find(p => p.email === email)`.
- **`role` field**: enables future permission tiers (e.g. members who can only read, not write).
- **`addedAt`**: audit trail for when each participant joined.

## Scope of changes

### TypeScript

- Replace `SharedExpenseParticipant` interface (or change `SharedExpense.participants` type to a Record).
- Every call site using `.map()`, `.find()`, or `.filter()` on `participants` must switch to `Object.entries()` / `Object.values()` / direct key access.
- Estimated call sites: ~12–15 across components and services.

### Files affected (non-exhaustive)

`src/types/index.ts`, `src/store.ts`, `src/services/databaseService.ts`, `src/state/AppState.ts`, `src/components/createSteps/createStep2.ts`, `src/components/createSteps/createStep3.ts`, `src/components/addExpense/expenseForm.ts`, `src/components/addPayment/paymentForm.ts`, `src/components/history/history.ts`, `src/components/dashboard/dashboard.ts`, `src/components/dashboard/debtList.ts`, `src/components/sharedExpenseList/sharedExpenseList.ts`, `src/components/profile/profile.ts`

### Data migration

All existing SE documents in Firestore store `participants` as an array. A migration script must convert each array element into a map entry keyed by email. The `role` field should default to `"creator"` for the creator's entry and `"member"` for all others.

## Acceptance criteria

- [ ] `SharedExpense.participants` is a `Record<string, ...>` in TypeScript
- [ ] No `.find(p => p.email === ...)` pattern remains on `participants`
- [ ] `pnpm build` passes with zero TypeScript errors
- [ ] Migration script tested on emulator before running against production data
- [ ] `resolveParticipantUid` in `databaseService.ts` updated to use map key access

## Related

- Source analysis: [#006](../closed/006-shared-expenses-model-refactor.md)
- Depends on: [#010](010-in-app-notification-system.md) (do after notifications ship)
