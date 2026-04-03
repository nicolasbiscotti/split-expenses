# [TODO] In-app notification system

**Type:** todo
**Opened:** 2026-04-02
**Resolved:** 2026-04-03

## Description

Users need to be notified in real time while the app is open about activity in their shared expense groups.

Specific scenarios that must trigger a notification:

- A participant adds a new expense to a group the current user belongs to.
- A participant records a payment in a group the current user belongs to.
- The current user is invited to a new shared expense group (i.e. their email is added as a participant by another user).

Notifications should be visible somewhere persistent in the app UI (e.g. a badge or notification panel) so the user does not miss them even if they are on a different view when the event occurs.

## Open Questions

- **Delivery mechanism**: Firestore real-time listeners (onSnapshot) vs. Firebase Cloud Messaging (FCM) push notifications. Since the requirement is limited to "when the app is open", Firestore listeners are likely sufficient and simpler — no service worker needed.
- **Storage**: Should notifications be stored in Firestore (per-user sub-collection) so they persist across sessions, or kept in memory only for the current session?
- **UI placement**: Badge on the bottom nav? A dedicated notifications panel/view? A toast queue?
- **Read/unread state**: Does the user need to mark notifications as read, or are they dismissed automatically?
- **Scope of listener**: Listening to all SEs the user belongs to could mean many active Firestore listeners. Consider a fan-out approach or a dedicated `notifications/{uid}` collection written to by the creating user (or Cloud Functions).

## Resolution

Issue restructured after sequencing analysis revealed prerequisite work. The open questions above are preserved and carried into the re-opened issue.

Prerequisites identified and sequenced as separate issues before implementation:
- #007 — fix `firestore.rules` security bugs (rules must be correct before listeners are built on top)
- #008 — rename `adminUid` → `creatorUid` and `payerEmail` → `paidByEmail` (field names must be final before listener code is written)
- #009 — frontend optimization patterns (bounded `onSnapshot` with `limit()` must be established before notification listeners are introduced)

Re-opened as **[#010](../open/010-in-app-notification-system.md)** with full prerequisite context.
