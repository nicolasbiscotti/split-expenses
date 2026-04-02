# [TODO] Design: displayName visibility per user in shared expenses

**Type:** todo
**Opened:** 2026-03-31

## Description

When user A invites user B by email (before B has signed up), the SE is stored with:

```
participants: [
  { email: A.email, displayName: A.name, uid: A.uid },
  { email: B.email, displayName: "b@example.com" }  // fallback: email as name
]
```

The `displayName` stored in `participants[]` on the SE document is the name **user A gave to B** at invitation time (usually via the contacts form, or the email itself as fallback).

This raises two open questions:

1. **Name A sees for B:** User A may have saved B in their contacts as "Benjamín". That name is stored in A's contacts collection and used as `displayName` when A created the SE. But what if A later renames that contact? The SE still holds the old name — there's no live sync.

2. **Name B sees for themselves:** When B signs in and resolves the invite, they see their own `displayName` as whatever A wrote — which might just be their email. B's actual Google `displayName` (e.g. "Ben García") is not retroactively applied to the SE's `participants` array.

3. **Name B sees for A:** B has no contacts yet. A's `displayName` in B's view of the SE comes from `participants[A_index].displayName`, which was set when A created the SE from their Google profile. This is probably correct.

## Possible approaches

- **On invite resolution:** when B signs in and `resolveParticipantUid()` runs, also update `participants[B_index].displayName` to B's actual Google `displayName`. This ensures B sees their own real name in the SE.
- **No live sync for other participants:** accept that a participant's name as seen by others is fixed at invite time (or at resolution time). This is the simplest approach and avoids extra complexity.
- **Per-user contact names (complex):** each user sees the `displayName` from their own contacts list. Requires storing per-user display names separately, which adds significant complexity.

## Recommendation

Implement the "resolve on sign-in" approach: when `resolveParticipantUid()` runs, update `participants[B_index].displayName` to the user's actual Google `displayName` if it differs. This is a single extra field in an already-running transaction and covers the most common complaint (user seeing their own email instead of their real name).
