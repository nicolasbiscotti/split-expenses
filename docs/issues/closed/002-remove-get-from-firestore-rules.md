# [TODO] Remove get() calls from firestore.rules sub-collection checks

**Type:** todo
**Opened:** 2026-03-31
**Resolved:** 2026-03-31

## Description

The current `firestore.rules` uses `get()` to read the parent shared expense document in order to check `participantUids` for expense and payment sub-collection access:

```
match /expenses/{expId} {
  allow read, write: if request.auth != null
    && request.auth.uid in
      get(/databases/$(database)/documents/environments/$(dataId)/sharedExpenses/$(seId)).data.get("participantUids", []);
}
```

This pattern has two downsides:
1. Each sub-collection read triggers an extra Firestore document read (billed and slower).
2. It's verbose and fragile — if the path ever changes, two places need updating.

## Resolution

The `get()` calls were removed entirely. Sub-collection rules now use fields stored directly on each expense/payment document:

- **Write authorization:** `resource.data.adminUid == request.auth.uid` (admin) or `resource.data.payerEmail == request.auth.token.email` / `resource.data.fromEmail == request.auth.token.email` (record owner)
- **Read authorization:** `request.auth != null` (any authenticated user — parent SE access already gates who can reach this path)

The `adminUid` field (equal to the SE's `creatorUid`, set at document creation time in `store.addExpense/addPayment`) makes the cross-document lookup unnecessary.

**Changed in:** `firestore.rules`
