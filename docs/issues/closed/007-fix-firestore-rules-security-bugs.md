# [TODO] Fix firestore.rules security bugs

**Type:** todo
**Opened:** 2026-04-03
**Resolved:** 2026-04-03

## Context

Identified during the analysis for #006. These are real security defects in the current `firestore.rules`, not style issues. They must be fixed before any listener-based work (#009, #010) is built on top.

## Bugs to fix

### Bug 1 — Expenses and payments read rule has no participant check

**Current rule:**
```javascript
match /expenses/{docId} {
  allow read: if request.auth != null;
}
```

**Problem:** Any authenticated user — including one with no relation to the group — can read all expenses and payments in any shared expense group. The `participantUids` check on the SE document is not enforced at the sub-collection level.

**Fix:** Gate reads on parent SE membership using `get()` (cached per request, so a list of 20 expenses costs 1 billed read, not 20):
```javascript
allow read: if isAuthenticated()
  && request.auth.uid in parentSE().participantUids;
```

### Bug 2 — Operator precedence error on create/update/delete rules

**Current rule (expenses):**
```javascript
allow create: if request.auth != null && request.resource.data.payerEmail == request.auth.token.email || request.resource.data.adminUid == request.auth.uid;
```

**Problem:** `&&` binds tighter than `||`, so this parses as:
```
(request.auth != null && payerEmail == email) || adminUid == uid
```
The second branch (`adminUid == uid`) has no `request.auth != null` guard — an unauthenticated request where `adminUid` happens to equal a null UID could theoretically pass. Same bug affects `update` and `delete` rules for both expenses and payments.

**Fix:** Explicit parentheses grouping:
```javascript
allow create: if request.auth != null
  && (
    resource.data.adminUid == request.auth.uid
    || request.resource.data.payerEmail == request.auth.token.email
  );
```

## Acceptance criteria

- [ ] No authenticated user outside a group can read its expenses or payments
- [ ] All create/update/delete rules have `request.auth != null` as an unconditional outer guard
- [ ] Rules are tested against the Firebase emulator before deploying

## Related

- Source analysis: [#006](006-shared-expenses-model-refactor.md)
- Must be completed before: [#008](../open/008-rename-adminuid-and-payeremail.md), [#009](../open/009-frontend-optimizations.md), [#010](../open/010-in-app-notification-system.md)

## Resolution

Both bugs fixed in `firestore.rules`:

1. **Read rules**: replaced `if request.auth != null` on expenses and payments with `if isSeParticipant()`, which calls `parentSE()` (a `get()` on the parent SE document) and checks `request.auth.uid in parentSE().participantUids`. Firestore caches the `get()` per request, so a list query of N documents costs 1 billed read, not N.

2. **Operator precedence**: all create/update/delete rules on expenses and payments now use an explicit `isAuthenticated()` outer guard followed by a parenthesized `||` condition. The unguarded `|| adminUid == uid` branch is eliminated.

3. **Refactored**: extracted `isAuthenticated()` helper used consistently across all rules. Added `parentSE()` and `isSeParticipant()` functions inside the `sharedExpenses/{seId}` block.
