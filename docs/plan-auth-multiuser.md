# Plan: Google Auth, Contacts, Profile, and Multi-User Data Model

## Context

The app currently has no authentication — participants are hardcoded (Fer/Seba/Nata), shared expenses are global to a single Firestore namespace, and there is no concept of ownership or access control. This plan introduces Google Sign-In, a per-user contacts system, a Profile view, and a complete data model overhaul so that shared expenses are tied to real users and visible to all invited participants.

---

## Key Design Decisions

### Profile + Contacts layout
**One combined `"profile"` view** — confirmed by user. Two stacked sections: user info + sign-out at the top, contacts list + add-by-email form below. Accessed via an **avatar button** added to the top-right of both `sharedExpenseTopBar` (dashboard views) and the `sharedExpenseList` header. No new bottom-nav item.

### Old data migration
Discard existing Firestore data (Fer/Seba/Nata test participants and old-format documents) — confirmed by user. A production data migration will be planned separately in the future.

### Auth gate
Handled **at the render layer** (not as a `ViewType`). `render()` checks `store.getCurrentUser()`: if `null`, renders the `Landing` component unconditionally. This keeps `ViewType` clean — `"landing"` is never a navigable view.

### Auth state placement
Lives in **`AppStore`** (`currentUser: UserProfile | null`). Auth lifecycle managed via a new `src/firebase/auth.ts` service. `AppStore.initializeForUser(user)` replaces the old constructor `loadFromStorage()` call.

### `VITE_FIRESTORE_DATA_ID` kept
The `environments/{dataId}/` path prefix is **retained**. Namespace isolation and Firestore Security Rules coexist as two independent layers. All collections move under this prefix, including the new `users/` collection.

### Participant identifier: email (not UID)
Expenses and payments use **email** as the payer/from/to identifier (`payerEmail`, `fromEmail`, `toEmail`), not UID. This is the only design that allows the creator to record expenses on behalf of any participant immediately after creating the shared expense, even when all other participants are unregistered and have no Firebase UID yet.

Display names are resolved from the `SharedExpense.participants` array (each entry stores email + displayName), which is loaded in memory with the shared expense — no separate profile cache needed.

### `SharedExpenseParticipant` embedded in SharedExpense
Each `SharedExpense` document stores:
- `participants: { email, displayName, uid? }[]` — source of truth for forms, history, and calculations
- `participantUids: string[]` — flat array derived from participants with a known UID; used for Firestore `array-contains` access-control queries
- `participantEmails: string[]` — flat array of all participant emails; used for invite-resolution `array-contains` queries on first sign-in

### Invite by email (no Cloud Functions)
When user A invites user B by email (not yet signed up): SE is stored with `participantEmails: [A.email, B.email]`, `participantUids: [A.uid]`, `participants: [{email: A.email, displayName: A.name, uid: A.uid}, {email: B.email, displayName: B.email}]`. The creator can immediately record expenses with B as a payer. When user B first signs in, `initializeForUser` queries `where("participantEmails", "array-contains", B.email)`, finds unresolved SEs, sets `participants[B_index].uid = B.uid`, and appends B.uid to `participantUids`.

---

## New Firestore Structure

All paths are prefixed with `environments/{dataId}/` (keeping existing namespace isolation).

```
environments/{dataId}/users/{uid}
    displayName: string
    email: string
    photoURL: string | null
    createdAt: Timestamp

environments/{dataId}/users/{uid}/contacts/{contactId}
    uid: string           // empty string if contact hasn't signed up yet
    email: string
    displayName: string   // cached at add time
    addedAt: Timestamp

environments/{dataId}/sharedExpenses/{sharedExpenseId}
    name, description, type, status, totalAmount, createdAt, closedAt?, periodName?
    creatorUid: string
    participants: { email, displayName, uid? }[]  // source of truth for forms + calculations
    participantUids: string[]    // derived; for array-contains access-control queries
    participantEmails: string[]  // derived; for invite-resolution queries on first sign-in

environments/{dataId}/sharedExpenses/{id}/expenses/{id}
    sharedExpenseId, amount, description, date, createdAt
    payerEmail: string   // was: payerId → now email, works for unregistered participants too

environments/{dataId}/sharedExpenses/{id}/payments/{id}
    sharedExpenseId, amount, date, createdAt
    fromEmail: string    // was: fromId
    toEmail: string      // was: toId
```

**Firestore index needed** (`firestore.indexes.json`):
```json
{ "collectionGroup": "sharedExpenses", "fields": [
    { "fieldPath": "participantUids", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
]}
```

**Security rules** (`firestore.rules`): Read/write on `sharedExpenses` gated by `request.auth.uid in resource.data.participantUids`. Sub-collections (expenses, payments) inherit via parent UID check. `users/{uid}` and `users/{uid}/contacts` gated by `request.auth.uid == uid`. All rules scoped under `environments/{dataId}/`.

---

## Updated Types (`src/types/index.ts`)

Remove: `Participant` interface.

Add:
```typescript
interface UserProfile { uid: string; displayName: string; email: string; photoURL: string | null }
interface Contact { uid: string; email: string; displayName: string }
interface SharedExpenseParticipant { email: string; displayName: string; uid?: string }
```

Modify:
- `Expense.payerId` → `payerEmail: string` (email-based; works for registered and unregistered)
- `Payment.fromId/toId` → `fromEmail/toEmail: string`
- `Balance.participantId` → `email: string`
- `Debt.fromId/toId` → `fromEmail/toEmail: string`
- `SharedExpense`: remove `participantIds`; add `creatorUid: string`, `participants: SharedExpenseParticipant[]`, `participantUids: string[]`, `participantEmails: string[]`
- `ViewType`: add `"profile"`
- `NewSharedExpenseData` (in `AppState`): `participantIds` → `participants: SharedExpenseParticipant[]`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/firebase/auth.ts` | `AuthService`: `signInWithGoogle()`, `signOut()`, `onAuthStateChanged()`, `getCurrentUser()`. Also `connectAuthEmulator` for localhost. |
| `src/components/landing/landing.ts` | Full-page landing: app description + Google Sign-In button. `setup` handles sign-in click + loading state + error toast. |
| `src/components/profile/profile.ts` | ViewType `"profile"`. Two sections: user info + sign-out button; contacts list + add-by-email form. |

---

## Files to Modify

### `src/firebase/config.ts`
- Change `const app` → `export const app`
- Add `export const auth = getAuth(app)` + `connectAuthEmulator(auth, "localhost", 9099)` for localhost
- Import `getAuth`, `connectAuthEmulator` from `"firebase/auth"`

### `src/types/index.ts`
All changes listed in "Updated Types" above.

### `src/services/databaseService.ts`
- Remove `participantService` entirely (no more Fer/Seba/Nata)
- Keep all `environments/${VITE_FIRESTORE_DATA_ID}/` path prefixes (namespace retained)
- Add `userProfileService`: `ensureProfile(user)`, `getProfile(uid)`
- Add `contactService`: `getContacts(ownerUid)`, `addContact(ownerUid, contact)`, `removeContact(ownerUid, contactId)`
- Update `sharedExpenseService.getAll()` → `getForUser(uid)`: uses `where("participantUids", "array-contains", uid) + orderBy("createdAt", "desc")`
- Add `sharedExpenseService.getByParticipantEmail(email)` for the invite-resolution flow on first sign-in
- Add `sharedExpenseService.resolveParticipantUid(seId, email, uid)`: updates `participants[i].uid`, appends uid to `participantUids`, for invite resolution
- Paths for expenses/payments remain `environments/{dataId}/sharedExpenses/{id}/expenses`

### `src/state/AppState.ts`
- `NewSharedExpenseData`: `participantIds` → `participants: SharedExpenseParticipant[]`
- `toggleParticipantInNew(participant: SharedExpenseParticipant, store)` — toggles by email
- `addParticipantToNew(participant: SharedExpenseParticipant, store)` — for the add-by-email path in step 2
- `canProceedToStep3()`: check `participants.length >= 2` (creator is auto-included as first entry)
- Add `goToProfile(store)` navigation helper

### `src/store.ts`
Major rewrite:
- Remove `participants: Participant[]`; add `currentUser: UserProfile | null`, `contacts: Contact[]`
- No `participantProfileCache` needed — participant info lives in `SharedExpense.participants`
- Remove `loadFromStorage()` / constructor `loadFromStorage()` call
- Add `initializeForUser(firebaseUser)`: upsert user profile → load contacts → query SEs by UID → run invite-resolution (email→UID) → restore cached SE id → trigger render
- Add `clearUserData()`: resets all fields, `currentUser = null`, triggers render
- Add `getCurrentUser()`, `getContacts()`, `addContact(email)`, `removeContact(contactId)`
- Add `getParticipantsForSharedExpense(seId): SharedExpenseParticipant[]` — reads directly from the loaded SE's `participants` array (no cache lookup needed)
- Update `createSharedExpense()`: include `creatorUid`, `participants`, `participantUids`, `participantEmails`
- Remove all `participantService` calls

### `src/main.ts`
Replace constructor-driven init with:
```typescript
authService.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    await store.initializeForUser(firebaseUser);
  } else {
    store.clearUserData();
    // clearUserData calls notify → render → auth gate shows landing
  }
});
```

### `src/render.ts`
- Add auth gate at top of `render()`:
  ```typescript
  if (!store.getCurrentUser()) {
    app.innerHTML = renderLanding(state, store);
    setupLanding(app, store);
    return;
  }
  ```
- Add `"profile"` case to `renderViewContent` and `setupViewInteractions`
- Add `"profile"` to the no-bottom-nav condition (same as create steps)

### `src/components/menus/sharedExpenseTopBar.ts`
- Accept `user: UserProfile` as second param
- Add avatar button (right side): `onclick="setView('profile')"` showing `user.photoURL` img or initials fallback

### `src/components/sharedExpenseList/sharedExpenseList.ts`
- Add avatar button in `renderList` header (same profile nav as top bar)
- `renderSharedExpenseCard`: replace `store.getParticipantsByIds()` with `store.getParticipantsForSharedExpense(se.id)` using `SharedExpenseParticipant[]`

### `src/components/createSteps/createStep2.ts`
Complete rewrite of render/setup:
- **Zone 1**: Current user shown as pre-checked, disabled item (always a participant)
- **Zone 2**: Contacts list as checkboxes (hidden if no contacts); selection calls `state.toggleParticipantInNew({ email, displayName, uid }, store)`
- **Zone 3**: "Agregar por email" input (always shown); on submit: `store.addContact(email)` → `state.addParticipantToNew({ email, displayName: email }, store)`
- If no contacts: show instructional text + only Zone 3

### `src/components/createSteps/createStep3.ts`
Build `SharedExpense` with `creatorUid`, `participants`, `participantUids` (filter participants with uid), `participantEmails` (all participant emails) from state data.

### `src/components/expenseForm/expenseForm.ts`
- "Quién pagó" select: iterate `store.getParticipantsForSharedExpense(currentSEId)` → option values = `participant.email`, display = `participant.displayName`
- Submit: `payerEmail` instead of `payerId`

### `src/components/paymentForm/paymentForm.ts`
- From/To selects: iterate `SharedExpenseParticipant[]`; option values = `participant.email`, display = `participant.displayName`
- Submit: `fromEmail`/`toEmail` instead of `fromId`/`toId`

### `src/components/history/history.ts`
- `renderExpenseItem`: look up `expense.payerEmail` in the SE's `participants` array → display `displayName`
- `renderPaymentItem`: same lookup for `fromEmail`/`toEmail`

### `src/components/dashboard/dashboard.ts` + `debtList.ts`
- Pass `SharedExpenseParticipant[]` to calculation functions
- Use `participant.email` as identifier, `participant.displayName` for display

### `src/util/calculations.ts`
- `calculateBalances(participants: SharedExpenseParticipant[], ...)` — `participant.email` replaces `participant.id`
- `Balance.email` replaces `Balance.participantId`
- `Debt.fromEmail`/`toEmail` replaces `fromId`/`toId`

---

## Features Suggested Beyond the Four Requests

1. **Firestore Security Rules** (`firestore.rules`) — currently absent; without rules the entire database is publicly writable. Must be added as part of this update.
2. **Auth Emulator** — `connectAuthEmulator` for localhost so Google Sign-In works offline in dev (mirrors existing Firestore emulator pattern).
3. **`.env.example` update** — keep `VITE_FIRESTORE_DATA_ID`; no changes needed since Auth uses the existing `VITE_FIREBASE_AUTH_DOMAIN`.
4. **Sign-out from profile view** — Users need a way to log out.
5. **Remove contact from profile view** — Add a delete button per contact (simple UX improvement).
6. **Participant names in shared expense card** — Currently shows count only; can now show actual display names from `se.participants`.

---

## Implementation Order

1. `src/firebase/config.ts` + `src/firebase/auth.ts`
2. `src/types/index.ts`
3. `src/services/databaseService.ts`
4. `firestore.rules` + `firestore.indexes.json`
5. `src/state/AppState.ts`
6. `src/store.ts`
7. `src/util/calculations.ts`
8. `src/main.ts`
9. `src/components/landing/landing.ts` (new)
10. `src/components/profile/profile.ts` (new)
11. `src/render.ts`
12. `src/components/menus/sharedExpenseTopBar.ts`
13. `src/components/sharedExpenseList/sharedExpenseList.ts`
14. `src/components/createSteps/createStep2.ts`
15. `src/components/createSteps/createStep3.ts`
16. `src/components/expenseForm/expenseForm.ts`
17. `src/components/paymentForm/paymentForm.ts`
18. `src/components/history/history.ts`
19. `src/components/dashboard/dashboard.ts` + `debtList.ts`

---

## Verification

- `pnpm build` — zero TypeScript errors
- Unauthenticated visit → landing page with Google Sign-In button
- Sign in with Google → redirects to `shared-expense-list`
- No contacts → wizard step 2 shows only the add-by-email form
- Add contact by email → appears in step 2 and profile contacts list
- Create shared expense with only unregistered participants → creator can immediately add expenses with any participant as payer
- Expense payer dropdown shows all participant display names (including unregistered)
- Create shared expense with 2+ participants → visible to all participants on their next sign-in
- Delete expense → total amount updated in list card immediately
- Profile view accessible from avatar button in header and list
- Sign out from profile → landing page shown
