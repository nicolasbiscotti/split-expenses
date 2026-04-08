# [TODO] In-app notification system

**Type:** todo
**Opened:** 2026-04-03
**Resolved:** 2026-04-08

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

## Response to open questions

- **Delivery mechanism**: Firestore `onSnapshot` listeners
- **Storage**: `unreadBy: string[]` array embedded on each expense/payment document. No separate notification collection. Badge count derived from loaded documents that include the current user's UID in `unreadBy`. Cleared via batch `arrayRemove` on navigate-to-History.
- **UI placement**: Badge on the History tab (current SE only) + blue toast for real-time events. SE invites surface as distinct amber cards in the SE list.
- **Read/unread state**: Automatically dismissed when navigating to History.
- **Listener scope**: Constant 4 listeners — SE collection (invite detection), SE document (metadata freshness), expenses sub-collection, payments sub-collection. No per-SE notification listeners.

## Resolution

Implemented as a two-part refactor: data sync overhaul + notification system.

### Part A — Data sync refactor

Replaced cursor-based `getDocs` pagination with `onSnapshot` listener-driven lists using an expanding limit pattern. Firestore is now the single source of truth for expense and payment lists. Local optimistic mutations removed.

- `startExpensesListener` / `startPaymentsListener` — N+1 limit trick to detect `hasMore`; pass items + hasMore + docChanges to store
- `startSeListener` — keeps SE metadata (`totalAmount`, `netPaid`, `expensesCount`) fresh
- "Load more" — increments `expensesLimit`/`paymentsLimit` and re-attaches same listener
- `createExpense` / `createPayment` transactions write `recordedByUid` and `unreadBy` (participantUids minus recordedByUid)

### Part B — Notification system

- `unreadBy: string[]` on each expense/payment doc is the source of truth
- `buildDocNotification` — pure function (unit tested, no Firebase config import); returns `{ notification, isRealtime } | null`; null if current user not in `unreadBy`
- `_processDocChanges` in store — processes "added" doc changes, pushes to `notifications[]`, fires toast for `isRealtime` events
- `markNotificationsReadInDb` — batch `arrayRemove` for current SE's notifications on navigate-to-History
- `startInviteListener` — listens on `participantEmails array-contains email`; filters own SE creations via `creatorUid` check to avoid duplication

### Part C — Invite UX

Replaced silent `resolveInvites` auto-resolve with explicit accept flow:
- Pending invite SEs render as amber cards in the SE list
- Clicking navigates to `invite-detail` view with SE info and "Unirse al grupo" button
- `store.acceptInvite` resolves the participant UID in Firestore and enters the dashboard
- Live invite detection: the SE collection listener silently prepends new invite cards while the user is active

### Bug fixes during implementation

1. **SE duplication** — Firebase `onSnapshot` fires synchronously within `addDoc`'s local cache write (before the Promise resolves). The invite listener would call `onNewSE` before `createSharedExpense` had a chance to push locally, causing duplicate SE cards. Fixed by filtering own creations in the listener: `if (seData.creatorUid === currentUser.uid) return`.

2. **SE creator could not record expenses for other participants** — the `store` refactor accidentally dropped `expense.creatorUid = se?.creatorUid ?? ""` and `payment.creatorUid = ...` assignments. Firestore rules match on `creatorUid`, so writes from the SE creator were rejected. Re-added before `recordedByUid` assignment.

## Files changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `recordedByUid`, `unreadBy` to `Expense`/`Payment`; added `AppNotification`, `NotificationType`; added `"invite-detail"` to `ViewType` |
| `src/services/databaseService.ts` | Removed cursor pagination; added `startExpensesListener`, `startPaymentsListener`, `startSeListener`, `markNotificationsReadInDb`; updated `createExpense`/`createPayment` to write `unreadBy`/`recordedByUid` |
| `src/services/notificationBuilders.ts` | New — pure `buildDocNotification` function |
| `src/services/notificationBuilders.test.ts` | New — 5 unit tests (TDD) |
| `src/services/notificationService.ts` | New — `startInviteListener` |
| `src/store.ts` | Major refactor — listener-driven data, `_startDataListeners`, `_processDocChanges`, notifications state, `isPendingInvite`, `acceptInvite`, `markNotificationsRead` |
| `src/state/AppState.ts` | Added `pendingInviteSeId`; `setCurrentView("history")` calls `store.markNotificationsRead()` |
| `src/components/inviteDetail/inviteDetail.ts` | New — invite detail view and setup |
| `src/components/sharedExpenseList/sharedExpenseList.ts` | Pending invite card rendering and click handler |
| `src/components/menus/bottomNavBar.ts` | Added `unreadCount` badge on History button |
| `src/util/toast.ts` | Added `"info"` type (blue) |
| `src/render.ts` | Wired `invite-detail` view; passes `getUnreadCount()` to nav bar |
| `firestore.rules` | Added `onlyUpdatingUnreadByField()` helper; split update/delete rules for expenses and payments |
| `firestore.indexes.json` | Added composite indexes for `unreadBy ARRAY_CONTAINS + createdAt DESCENDING` |
| `scripts/firebase-admin-sdk/seed-emulator.js` | Added `recordedByUid` and `unreadBy` to seeded docs |

## Acceptance criteria

- [x] Open questions above are answered and documented before coding starts
- [x] Notification appears when another user adds an expense to a shared group
- [x] Notification appears when another user records a payment in a shared group
- [x] Notification appears when the current user is added to a new group
- [x] Notifications are visible regardless of which view the user is currently on
- [x] All listeners are bounded (no unbounded `onSnapshot` calls)
- [x] Unsubscribe is called on sign-out to prevent memory leaks and unauthorized reads

## Related

- Original issue: [#005](../closed/005-in-app-notification-system.md)
- Depends on: [#007](007-fix-firestore-rules-security-bugs.md), [#008](008-rename-adminuid-and-payeremail.md), [#009](009-frontend-optimizations.md)
