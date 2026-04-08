# Session: Issue #010 — Data sync refactor + In-app notification system

**Date:** 2026-04-08
**Branch:** develop-0604-to

## What was done

Implemented issue #010 in full: a data sync overhaul paired with an in-app notification system.

### Data sync refactor

Replaced optimistic local mutations + cursor-based `getDocs` pagination with `onSnapshot` listener-driven lists. Firestore is now the single source of truth for expenses and payments.

- N+1 limit trick: queries `limit(N+1)`, slices to N for display, uses the extra doc to set `hasMore`
- "Load more" increments `expensesLimit`/`paymentsLimit` and re-attaches the same listener
- Local SE patches (totalAmount, netPaid, expensesCount) are kept for immediate feedback; the SE document listener confirms shortly after

### Notification system

- `unreadBy: string[]` on each expense/payment doc is the single source of truth for unread state
- Own writes exclude the recorder's UID from `unreadBy` at creation time (`recordedByUid` field added for audit and self-filter)
- `buildDocNotification` pure function distinguishes catch-up (isRealtime: false) from real-time (isRealtime: true) by comparing `doc.createdAt` against `listenerStart`
- Badge on History tab counts notifications for current SE only
- Blue toast fires for real-time events only
- On navigate-to-History: batch `arrayRemove` clears `unreadBy` in Firestore

### Invite UX

Replaced silent `resolveInvites()` auto-resolve with an explicit accept flow:
- Pending invite SEs render as amber cards in the SE list
- Clicking → `invite-detail` view → "Unirse al grupo" button → `acceptInvite()` resolves UID in Firestore → dashboard
- Live invite detection: the SE collection listener silently prepends new invite cards while the user is active

## Design decisions

| Question | Decision | Reason |
|----------|----------|--------|
| Data source of truth | `onSnapshot` listeners | Eliminates stale data from concurrent edits; pagination cursors were incompatible with real-time updates |
| Notification storage | `unreadBy[]` on expense/payment docs | No separate collection; scoped deletion; no Cloud Functions needed |
| Self-filter | Exclude `recordedByUid` from `unreadBy` at write time | Firestore lacks `array-not-contains`; write-time exclusion is simpler than read-time filtering |
| Badge scope | Current SE only | Avoids complexity of cross-SE notification aggregation |
| Catch-up window | Bounded by `PAGE_SIZE` (grows with "load more") | Simpler than a separate 7-day query; consistent with the listener-driven model |
| Invite flow | Explicit accept (amber card → detail view) | Surfaces pending invites visually; avoids silent UID resolution on login |
| Invite listener dedup | Filter `creatorUid === currentUser.uid` in listener | Firebase `onSnapshot` fires synchronously inside `addDoc` before the Promise resolves; the store's local unshift happens after, causing duplication if the listener also fires `onNewSE` |

## TDD flow

1. Wrote `notificationBuilders.test.ts` (5 tests, all red)
2. Implemented `buildDocNotification` in `notificationBuilders.ts` (all green)
3. Refactored `databaseService.ts` and `store.ts` around the confirmed interface

## Bugs found and fixed

**Bug 1 — SE duplication on creation**
- Root cause: Firebase SDK fires `onSnapshot` synchronously within `addDoc`'s local cache write, before the Promise resolves. The invite listener called `onNewSE` before `createSharedExpense` pushed locally, then `createSharedExpense` pushed again.
- Fix: `if (seData.creatorUid === currentUser.uid) return` in `notificationService.ts`. Own SE creations are semantically not invites.
- A safety-net duplicate check remains in the store callback for belt-and-suspenders.

**Bug 2 — SE creator could not record expenses/payments for other participants**
- Root cause: the store refactor dropped `expense.creatorUid = se?.creatorUid ?? ""` assignments. Firestore rules match on `creatorUid`, so the creator's writes were rejected.
- Fix: re-added `creatorUid` assignment before `recordedByUid` in `addExpense` and `addPayment`.

## Files changed

| File | Change |
|------|--------|
| `src/types/index.ts` | `recordedByUid`, `unreadBy` on Expense/Payment; `AppNotification`; `NotificationType`; `"invite-detail"` ViewType |
| `src/services/databaseService.ts` | Removed cursor pagination; added `startExpensesListener`, `startPaymentsListener`, `startSeListener`, `markNotificationsReadInDb`; updated writes |
| `src/services/notificationBuilders.ts` | New — `buildDocNotification` pure function |
| `src/services/notificationBuilders.test.ts` | New — 5 unit tests |
| `src/services/notificationService.ts` | New — `startInviteListener` |
| `src/store.ts` | Major refactor — listener-driven data, `_startDataListeners`, `_processDocChanges`, notifications state |
| `src/state/AppState.ts` | `pendingInviteSeId`; calls `markNotificationsRead` on navigate-to-history |
| `src/components/inviteDetail/inviteDetail.ts` | New — invite detail view |
| `src/components/sharedExpenseList/sharedExpenseList.ts` | Pending invite card |
| `src/components/menus/bottomNavBar.ts` | Unread badge on History button |
| `src/util/toast.ts` | `"info"` type |
| `src/render.ts` | `invite-detail` case; `getUnreadCount()` wired |
| `firestore.rules` | `onlyUpdatingUnreadByField()` helper; split update/delete rules |
| `firestore.indexes.json` | Composite indexes for `unreadBy + createdAt` |
| `scripts/firebase-admin-sdk/seed-emulator.js` | `recordedByUid` and `unreadBy` on seeded docs |

---

## Original plan

> See: `/home/nicolas/.claude/plans/valiant-enchanting-rainbow.md`

The plan was followed closely. Key deviation: the catch-up window changed from a server-side 7-day `where` query to a simpler "bounded by PAGE_SIZE" approach — no separate notification listener needed, and the user can expand the window with "load more".
