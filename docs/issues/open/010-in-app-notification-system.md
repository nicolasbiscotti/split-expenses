# [TODO] In-app notification system

**Type:** todo
**Opened:** 2026-04-03

## Context

Re-opened from #005 after sequencing analysis. Prerequisites are now tracked as separate issues (#007, #008, #009) that must be resolved first. The original open questions from #005 are preserved below.

## Description

Users need to be notified in real time while the app is open and at the moment they open the app about activity in their shared expense groups.

Scenarios that must trigger a notification:

- A participant (creator of the SE or a participant) adds a new expense to a group the current user belongs to.
- A participant (creator of the SE or a participant) records a payment in a group the current user belongs to.
- The current user is invited to a new shared expense group (their email is added as a participant by another user).

Notifications should be visible somewhere persistent in the app UI (e.g. a badge or notification panel) so the user does not miss them even if they are on a different view when the event occurs.

## Open questions to resolve before implementation

- **Delivery mechanism**: Firestore `onSnapshot` listeners (sufficient for "app open" requirement, no service worker needed) vs. Firebase Cloud Messaging (FCM) for background delivery. Recommend starting with `onSnapshot` only.
- **Storage**: Notifications stored in Firestore (`notifications/{uid}` sub-collection, persists across sessions) vs. in-memory only (lost on refresh). In-memory is simpler but loses notifications on page reload.
- **UI placement**: Badge on the bottom nav? A dedicated notifications panel/view? A toast queue? All three have different implementation costs.
- **Read/unread state**: Does the user mark notifications as read, or are they dismissed automatically after viewing?
- **Listener scope**: One `onSnapshot` per SE the user belongs to (N listeners) vs. a dedicated `notifications/{uid}` collection that any participant writes to when they add an expense/payment (1 listener, fan-out write pattern). The fan-out approach scales better and avoids N listeners per user.

## Response to open question
- **Delivery mechanism**: Firestore `onSnapshot` listeners
- **Storage**: Notifications stored in Firestore (notification reads by all participants of the group must be deleted, notifications older than seven days must be deleted). I think that notification must live somewhere under ${BASE}/sharedExpenses/${sharedExpenseId}/ so the number of notification to delete is scoped and can be deleted with low effort (e.g a unreadBy array under expenses and payments)
- **UI placement**: Add a badge to the history button for expenses and payments. For the SE user, a badge appears on the "Mis Gastos" button when viewing or working in a particular SE. When they go to the SE list, an opaque card appears so they can accept the new invitation.
- **Read/unread state**: The notifications are dismissed automatically.
- **Listener scope**: We must make sure that along side with the notification the actual expense and payment are displayed on the UI. Same with SE card.


## Implementation notes

By the time this issue is started:
- `firestore.rules` will correctly gate sub-collection reads on participant membership (#007)
- Field names will be `creatorUid` and `paidByEmail` (#008)
- The bounded `onSnapshot` pattern with `limit()` will be established (#009)

## Acceptance criteria

- [ ] Open questions above are answered and documented before coding starts
- [ ] Notification appears when another user adds an expense to a shared group
- [ ] Notification appears when another user records a payment in a shared group
- [ ] Notification appears when the current user is added to a new group
- [ ] Notifications are visible regardless of which view the user is currently on
- [ ] All listeners are bounded (no unbounded `onSnapshot` calls)
- [ ] Unsubscribe is called on sign-out to prevent memory leaks and unauthorized reads

## Related

- Original issue: [#005](../closed/005-in-app-notification-system.md)
- Depends on: [#007](007-fix-firestore-rules-security-bugs.md), [#008](008-rename-adminuid-and-payeremail.md), [#009](009-frontend-optimizations.md) (Item 1)
