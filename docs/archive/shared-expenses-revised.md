# Firestore Shared Expenses — Revised Design

## Design Philosophy

Use `get()` only where the alternative (denormalization) costs more in complexity than the read costs. Avoid `get()` anywhere `resource.data` or `request.resource.data` already contains the fields needed for the rule.

---

## Where `get()` Is and Isn't Needed

| Operation | Target doc | Needs parent data? | Strategy |
|---|---|---|---|
| **SE read** | SE doc | No — `resource.data` has `participantUids` | `resource.data` |
| **SE create** | SE doc | No — `request.resource.data` has everything | `request.resource.data` |
| **SE update/delete** | SE doc | No — `resource.data.creatorUid` is on the doc | `resource.data` |
| **Expense/Payment read** | Subcollection doc | Yes — need parent's `participantUids` | **`get()` parent** |
| **Expense/Payment create** | Subcollection doc | Yes — need parent's `participantUids` + `creatorUid` | **`get()` parent** |
| **Expense/Payment update** | Subcollection doc | Partially — need `creatorUid` for "creator can edit any" | **Denormalize `creatorUid` only** |
| **Expense/Payment delete** | Subcollection doc | Same as update | **Denormalize `creatorUid` only** |

**Key decision:** We denormalize only `creatorUid` onto subcollection documents. This is a single string value that effectively never changes (transferring SE ownership is an edge case you can handle in a Cloud Function if ever needed). This eliminates `get()` from update and delete rules, which are the operations most likely to happen in quick succession (user editing or deleting several expenses).

For **reads and creates**, we use `get()` on the parent SE document. Firestore caches `get()` results within the same rules evaluation request, so a list query that returns 20 expenses and calls `get()` on the same parent path for each document's rule check is billed as a **single cached read**, not 20.

---

## Revised Schema

### `environments/{dataId}/sharedExpenses/{seId}`

Unchanged from the previous design — this document is the single source of truth for membership.

```typescript
{
  name: string;
  description: string;
  currency: string;

  creatorUid: string;
  creatorEmail: string;

  participantUids: string[];       // array-contains queryable
  participantEmails: string[];     // queryable for invite resolution

  participants: {
    [email: string]: {
      displayName: string;
      uid: string | null;
      role: "creator" | "member";
      addedAt: Timestamp;
    }
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `environments/{dataId}/sharedExpenses/{seId}/expenses/{expId}`

**Changed from previous design:** Removed `participantUids`. Kept only `creatorUid` as the single denormalized field.

```typescript
{
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: Timestamp;

  paidByEmail: string;
  paidByUid: string | null;

  splits: {
    [email: string]: {
      amount: number;
      uid: string | null;
    }
  };

  recordedByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Single denormalized field — stable, never needs sync
  creatorUid: string;
}
```

### `environments/{dataId}/sharedExpenses/{seId}/payments/{payId}`

Same change — only `creatorUid` denormalized.

```typescript
{
  amount: number;
  currency: string;
  date: Timestamp;
  note: string;

  fromEmail: string;
  fromUid: string | null;
  toEmail: string;
  toUid: string | null;

  recordedByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Single denormalized field
  creatorUid: string;
}
```

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /environments/{dataId} {

      match /sharedExpenses/{seId} {

        // ── SE-level rules: zero get() calls ──

        function isAuthenticated() {
          return request.auth != null;
        }

        allow read: if isAuthenticated()
          && request.auth.uid in resource.data.participantUids;

        allow create: if isAuthenticated()
          && request.resource.data.creatorUid == request.auth.uid
          && request.auth.uid in request.resource.data.participantUids;

        allow update: if isAuthenticated()
          && resource.data.creatorUid == request.auth.uid;

        allow delete: if isAuthenticated()
          && resource.data.creatorUid == request.auth.uid;


        // ── Shared helper: one get() to parent SE ──

        function parentSE() {
          return get(/databases/$(database)/documents
                     /environments/$(dataId)
                     /sharedExpenses/$(seId)).data;
        }


        // ── Expenses ──

        match /expenses/{expId} {

          // READ: get() to check caller is a participant
          allow read: if isAuthenticated()
            && request.auth.uid in parentSE().participantUids;

          // CREATE: get() to check membership + creator status
          allow create: if isAuthenticated()
            && request.resource.data.recordedByUid == request.auth.uid
            // Caller must be a participant of the SE
            && request.auth.uid in parentSE().participantUids
            // Creator can record for anyone; non-creator only for self
            && (
              request.resource.data.creatorUid == request.auth.uid
              || request.resource.data.paidByUid == request.auth.uid
            )
            // creatorUid on the new doc must match the actual SE creator
            && request.resource.data.creatorUid == parentSE().creatorUid;

          // UPDATE: no get() — uses resource.data.creatorUid (denormalized)
          allow update: if isAuthenticated()
            && (
              resource.data.creatorUid == request.auth.uid
              || resource.data.recordedByUid == request.auth.uid
            )
            // Lock the denormalized + audit fields
            && request.resource.data.creatorUid == resource.data.creatorUid
            && request.resource.data.recordedByUid == resource.data.recordedByUid;

          // DELETE: no get() — uses denormalized creatorUid
          allow delete: if isAuthenticated()
            && resource.data.creatorUid == request.auth.uid;
        }


        // ── Payments ──

        match /payments/{payId} {

          allow read: if isAuthenticated()
            && request.auth.uid in parentSE().participantUids;

          allow create: if isAuthenticated()
            && request.resource.data.recordedByUid == request.auth.uid
            && request.auth.uid in parentSE().participantUids
            && (
              request.resource.data.creatorUid == request.auth.uid
              || request.resource.data.fromUid == request.auth.uid
            )
            && request.resource.data.creatorUid == parentSE().creatorUid;

          allow update: if isAuthenticated()
            && (
              resource.data.creatorUid == request.auth.uid
              || resource.data.recordedByUid == request.auth.uid
            )
            && request.resource.data.creatorUid == resource.data.creatorUid
            && request.resource.data.recordedByUid == resource.data.recordedByUid;

          allow delete: if isAuthenticated()
            && resource.data.creatorUid == request.auth.uid;
        }
      }
    }
  }
}
```

### `get()` call summary

| Operation | `get()` calls | Why |
|---|---|---|
| SE read / create / update / delete | 0 | `resource.data` is sufficient |
| Expense or Payment **read** | 1 (cached across list) | Need parent's `participantUids` |
| Expense or Payment **create** | 1 | Need parent's `participantUids` + validate `creatorUid` |
| Expense or Payment **update** | 0 | `creatorUid` is denormalized; `recordedByUid` is on the doc |
| Expense or Payment **delete** | 0 | `creatorUid` is denormalized |

---

## Frontend Optimization

### 1. Paginate subcollection reads

Never load all expenses at once. Use cursor-based pagination:

```typescript
const PAGE_SIZE = 20;

// First page
const first = await getDocs(
  query(
    collection(db, `environments/${dataId}/sharedExpenses/${seId}/expenses`),
    orderBy('date', 'desc'),
    limit(PAGE_SIZE)
  )
);

// Next page — uses the last doc as cursor
const next = await getDocs(
  query(
    collection(db, `environments/${dataId}/sharedExpenses/${seId}/expenses`),
    orderBy('date', 'desc'),
    startAfter(first.docs[first.docs.length - 1]),
    limit(PAGE_SIZE)
  )
);
```

**Cost:** 20 reads per page + 1 cached `get()` in rules = 21 billed reads per page load.

### 2. Use real-time listeners selectively

```typescript
// GOOD: Listen to the SE doc (single doc, changes rarely)
const unsubSE = onSnapshot(
  doc(db, `environments/${dataId}/sharedExpenses/${seId}`),
  (snap) => updateSEState(snap.data())
);

// GOOD: Listen to the latest N expenses (bounded snapshot)
const unsubExpenses = onSnapshot(
  query(
    collection(db, `environments/${dataId}/sharedExpenses/${seId}/expenses`),
    orderBy('date', 'desc'),
    limit(20)
  ),
  (snap) => {
    // After initial load, only changed docs are re-read
    snap.docChanges().forEach((change) => {
      // handle added/modified/removed
    });
  }
);

// BAD: Listening to an unbounded collection
// onSnapshot(collection(db, `.../expenses`)) ← no limit = reads everything
```

**Why this matters:** After the initial snapshot, `onSnapshot` only reads docs that actually changed. If someone adds 1 expense, the listener fires with 1 new doc read (+ 1 `get()` in rules), not 20.

### 3. Enable offline persistence

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
```

Reads served from cache cost zero. This is particularly impactful for the SE list screen — once loaded, it renders instantly on subsequent app opens and only fetches deltas from the server.

### 4. Batch writes for related operations

When an expense affects the SE's summary data (if you store computed balances):

```typescript
const batch = writeBatch(db);

batch.set(
  doc(collection(db, `environments/${dataId}/sharedExpenses/${seId}/expenses`)),
  expenseData
);

// If you maintain a balance summary on the SE doc:
batch.update(
  doc(db, `environments/${dataId}/sharedExpenses/${seId}`),
  { updatedAt: serverTimestamp() }
);

await batch.commit();
// 2 writes billed, 1 round trip
```

### 5. Load the SE list with a single query

```typescript
const mySEs = await getDocs(
  query(
    collection(db, `environments/${dataId}/sharedExpenses`),
    where('participantUids', 'array-contains', currentUser.uid),
    orderBy('updatedAt', 'desc')
  )
);
```

**Cost:** N reads where N = number of SEs the user belongs to. No `get()` calls — the SE doc itself has `participantUids`.

---

## Free Plan (Spark) Capacity Analysis

### Firestore Spark Plan Limits

| Resource | Daily limit |
|---|---|
| Document reads | 50,000 |
| Document writes | 20,000 |
| Document deletes | 20,000 |
| Stored data | 1 GiB |
| Network egress | 10 GiB/month |

### Usage Model Per User Per Day

Assumptions for a typical shared-expenses user:

- Opens the app **2× per day**
- Belongs to **3 shared expense groups**
- Views expenses in **1 group per session** (most recent)
- Records **1 expense every other day** (0.5/day average)
- Pages through expenses once (20 per page)

| Action | Reads | Writes | Frequency/day |
|---|---|---|---|
| Load SE list | 3 | 0 | 2 |
| Open one SE (doc) | 1 | 0 | 2 |
| Load expenses page (20 + 1 get()) | 21 | 0 | 2 |
| Load payments page (10 + 1 get()) | 11 | 0 | 1 |
| Real-time listener delta (SE doc) | 1 | 0 | 2 |
| Record an expense | 1 | 1 | 0.5 |
| **Total per user per day** | **~83** | **~0.5** | |

### Scaling Table

| Users | Reads/day | % of 50K limit | Writes/day | % of 20K limit | Verdict |
|---|---|---|---|---|---|
| 10 | ~830 | 1.7% | ~5 | <0.1% | Comfortable |
| 25 | ~2,075 | 4.2% | ~13 | <0.1% | Comfortable |
| 50 | ~4,150 | 8.3% | ~25 | 0.1% | Comfortable |
| 100 | ~8,300 | 16.6% | ~50 | 0.3% | Fine |
| 200 | ~16,600 | 33.2% | ~100 | 0.5% | Manageable |
| 300 | ~24,900 | 49.8% | ~150 | 0.8% | At the edge |
| 400 | ~33,200 | 66.4% | ~200 | 1.0% | Over budget |

### What Pushes You Over Faster

The table above assumes disciplined frontend code. These mistakes accelerate quota consumption:

1. **Unbounded listeners.** An `onSnapshot` without `limit()` on an expenses collection with 200 docs reads all 200 on every reconnect — that's 200 reads instead of 20. Mobile apps reconnect frequently (network switches, app backgrounding). A single user with an unbounded listener could burn 1,000+ reads/day.

2. **Redundant queries.** Loading the SE list on every screen transition instead of caching it in app state. Each unnecessary list reload costs 3–5 reads.

3. **No offline persistence.** Without local cache, every app cold-start re-reads everything from the server. With persistence enabled, cold starts serve from cache and only sync deltas.

4. **Polling instead of listeners.** Calling `getDocs()` on a timer instead of using `onSnapshot`. A 30-second poll on a 20-doc collection runs 2,880 queries/day = 57,600 reads/day per user.

### Storage Estimate

| Data type | Avg doc size | Docs per active SE/month | 10 users, 5 SEs |
|---|---|---|---|
| SE document | ~1 KB | 1 | 5 KB |
| Expense | ~500 B | 30 | 75 KB |
| Payment | ~400 B | 5 | 10 KB |
| **Monthly growth** | | | **~90 KB** |

At this rate you would need **~11,000 months** to hit the 1 GiB storage limit. Storage is not a concern.

### Recommendation Thresholds

| User count | Plan recommendation |
|---|---|
| 1–200 | Spark (free) is sufficient with proper frontend discipline |
| 200–300 | Monitor daily reads; enable offline persistence if not already |
| 300+ | Move to Blaze (pay-as-you-go); reads beyond 50K/day cost $0.06 per 100K |

The `get()` calls in security rules add roughly **25% overhead** to subcollection reads (1 extra read per list query). At 200 users this means ~4,000 extra reads/day from `get()` — well within the free quota. The overhead only becomes a billing concern at scale levels that already require Blaze.

---

## Summary of Changes from Previous Design

| Aspect | Previous (no get()) | Revised (optimized get()) |
|---|---|---|
| `participantUids` on expenses/payments | Denormalized (full array) | Removed — checked via `get()` in rules |
| `creatorUid` on expenses/payments | Denormalized | Kept — stable value, eliminates `get()` for updates/deletes |
| Cloud Function for sync | Required (propagate participant changes) | Not needed — parent SE is source of truth |
| Eventual consistency risk | Yes (function could fail mid-batch) | None — `get()` always reads current data |
| Rule `get()` calls per operation | 0 | 0–1 depending on operation |
| Expense/payment doc size | Larger (carried full UID array) | Smaller (only `creatorUid` added) |