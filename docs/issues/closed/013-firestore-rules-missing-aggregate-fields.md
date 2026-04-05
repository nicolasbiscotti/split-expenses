# [BUG] Non-creator participants cannot create or delete expenses and payments

**Type:** bug
**Opened:** 2026-04-05
**Resolved:** 2026-04-05

## Description

When a non-creator participant tries to create or delete an expense or payment, the Firestore transaction is rejected with `permission-denied`. Only the SE creator can perform these actions successfully.

## Root cause

Every expense/payment mutation now runs as a Firestore transaction that also updates the SE document with `expensesCount` and `netPaid` (added in the pagination bug-fix). Firestore evaluates each write in the transaction independently. The SE update rule for non-creator participants was gated by `onlyUpdatingJoinFields()`:

```javascript
function onlyUpdatingJoinFields() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['participantUids', 'participants', 'totalAmount']);
}

allow update: if isCreator()
  || (isInvitedByEmail() && onlyUpdatingJoinFields() && isAddingOwnUid());
```

`expensesCount` and `netPaid` were not in the `hasOnly` list, so the SE update failed for any non-creator, rolling back the entire transaction.

Before the aggregate fields were introduced, only `totalAmount` was updated and the rule passed. The regression was introduced when `expensesCount` and `netPaid` were added to the transaction.

## Fix

Added a new `onlyUpdatingAggregateFields()` helper and a third `allow update` branch in `firestore.rules` that lets any registered participant update only the aggregate fields. Also removed the now-redundant `totalAmount` from `onlyUpdatingJoinFields()` — the join-resolution flow (`resolveParticipantUid`) never touches `totalAmount`.

```javascript
function onlyUpdatingJoinFields() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['participantUids', 'participants']);
}

function onlyUpdatingAggregateFields() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['totalAmount', 'expensesCount', 'netPaid']);
}

allow update: if isCreator()
  || (isInvitedByEmail() && onlyUpdatingJoinFields() && isAddingOwnUid())
  || (isParticipant() && onlyUpdatingAggregateFields());
```

The third branch uses `isParticipant()` (UID or email in participant list) and restricts writes to only the three aggregate fields — the same fields the expense/payment transactions update. This prevents participants from modifying group settings, membership, or any other SE field.

## Resolution

- **File changed:** `firestore.rules`
- All three `allow update` branches now cover: full creator access, invite resolution (join fields only), and expense/payment transactions (aggregate fields only).

## Acceptance criteria

- [x] Non-creator participant can add an expense to an SE they belong to
- [x] Non-creator participant can delete their own expense
- [x] Non-creator participant can record a payment in an SE they belong to
- [x] Non-creator participant can delete their own payment
- [x] Creator retains full update access
- [x] Participant cannot update group name, description, participants, or any field outside `totalAmount`, `expensesCount`, `netPaid`

## Related

- Introduced by: aggregate fields added to SE transactions (pagination bug-fix for #009)
- Affected file: `firestore.rules`
