# [BUG] Non-creator participants cannot create or delete expenses and payments

**Type:** bug
**Opened:** 2026-04-05

## Description

When a non-creator participant tries to create or delete an expense or payment, the Firestore transaction is rejected with `permission-denied`. Only the SE creator can perform these actions successfully.

## Root cause

Every expense/payment mutation now runs as a Firestore transaction that also updates the SE document with `expensesCount` and `netPaid` (added in the pagination bug-fix). Firestore evaluates each write in the transaction independently. The SE update rule for non-creator participants is gated by `onlyUpdatingJoinFields()`:

```javascript
function onlyUpdatingJoinFields() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['participantUids', 'participants', 'totalAmount']);
}

allow update: if isCreator()
  || (isInvitedByEmail() && onlyUpdatingJoinFields() && isAddingOwnUid());
```

`expensesCount` and `netPaid` are not in the `hasOnly` list, so the SE update fails for any non-creator, rolling back the entire transaction.

Before the aggregate fields were introduced, only `totalAmount` was updated and the rule passed. The regression was introduced when `expensesCount` and `netPaid` were added to the transaction.

## Fix

Add a new `onlyUpdatingAggregateFields()` helper and a third `allow update` branch in `firestore.rules` that lets any registered participant update only the aggregate fields:

```javascript
function onlyUpdatingAggregateFields() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['totalAmount', 'expensesCount', 'netPaid']);
}

allow update: if isCreator()
  || (isInvitedByEmail() && onlyUpdatingJoinFields() && isAddingOwnUid())
  || (isParticipant() && onlyUpdatingAggregateFields());
```

The third branch uses `isParticipant()` (UID or email in participant list) and restricts writes to only the three aggregate fields — the same fields the transaction updates. This prevents participants from modifying group settings, membership, or any other SE field.

## Acceptance criteria

- [ ] Non-creator participant can add an expense to an SE they belong to
- [ ] Non-creator participant can delete their own expense
- [ ] Non-creator participant can record a payment in an SE they belong to
- [ ] Non-creator participant can delete their own payment
- [ ] Creator retains full update access
- [ ] Participant cannot update group name, description, participants, or any field outside `totalAmount`, `expensesCount`, `netPaid`

## Related

- Introduced by: aggregate fields added to SE transactions (pagination bug-fix for #009)
- Affected file: `firestore.rules`
