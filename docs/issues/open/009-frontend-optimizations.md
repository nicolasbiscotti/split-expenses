# [TODO] Frontend optimizations — bounded listeners, offline persistence, pagination

**Type:** todo
**Opened:** 2026-04-03

## Context

Identified in `docs/shared-expenses-revised.md` (Frontend Optimization section) and surfaced during the analysis for #006. The bounded `onSnapshot` pattern is a hard prerequisite for the notification system (#010) — introducing unbounded listeners would burn Firestore quota and degrade performance. The other items are independent but cheap to apply at the same time.

## Items

### Item 1 — Bounded real-time listeners (prerequisite for #010)

Any `onSnapshot` call without a `limit()` reads the entire collection on every reconnect (network switches, app backgrounding). A single user with an unbounded listener on a 200-expense collection could generate 1,000+ reads/day.

**Pattern to establish:**
```typescript
const unsubExpenses = onSnapshot(
  query(
    collection(db, `.../expenses`),
    orderBy('date', 'desc'),
    limit(20)           // always bounded
  ),
  (snap) => {
    snap.docChanges().forEach((change) => {
      // handle added / modified / removed
    });
  }
);
```

Decide and document the standard page size constant (suggested: 20) so #010 uses it consistently.

### Item 2 — Offline persistence

Single-line config change. Reads served from cache cost zero — cold app starts render instantly and only sync deltas from the server.

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
```

Check `src/firebase/config.ts` — if `getFirestore()` is used there, replace it with `initializeFirestore()` with the cache option.

### Item 3 — Cursor-based pagination for expense/payment lists

Never load all expenses at once. Replace the current unbounded `getDocs` calls with paginated queries:

```typescript
const PAGE_SIZE = 20;

const firstPage = await getDocs(
  query(
    collection(db, `.../expenses`),
    orderBy('date', 'desc'),
    limit(PAGE_SIZE)
  )
);

// Next page uses last doc as cursor
const nextPage = await getDocs(
  query(
    collection(db, `.../expenses`),
    orderBy('date', 'desc'),
    startAfter(firstPage.docs[firstPage.docs.length - 1]),
    limit(PAGE_SIZE)
  )
);
```

Requires adding "load more" UI to the expense/payment history view.

### Item 4 — Avoid redundant SE list reloads (already partially done)

The SE list is cached in `AppStore.sharedExpenses`. Verify no component triggers a fresh `getDocs` on every view transition. If the list is only loaded on sign-in and after mutations, this item is already resolved.

## Acceptance criteria

- [ ] No unbounded `onSnapshot` or `getDocs` call exists on expense or payment collections
- [ ] `PAGE_SIZE` constant is defined and used consistently
- [ ] Offline persistence is enabled in `src/firebase/config.ts`
- [ ] Expense/payment history view has a "load more" control (or infinite scroll)
- [ ] SE list is not re-fetched on every view navigation

## Related

- Source: `docs/shared-expenses-revised.md` (Frontend Optimization section)
- Source analysis: [#006](../closed/006-shared-expenses-model-refactor.md)
- Item 1 must be completed before: [#010](010-in-app-notification-system.md)
