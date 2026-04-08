import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { SharedExpense, UserProfile } from "../types";

const DATA_ID = import.meta.env.VITE_FIRESTORE_DATA_ID;
const BASE = `environments/${DATA_ID}`;

/**
 * Listens for new shared expense invites while the user is signed in.
 * Fires onNewSE only for SEs that appear after the listener starts
 * (i.e. not in the initial snapshot).
 */
export function startInviteListener(
  sharedExpenses: SharedExpense[],
  currentUser: UserProfile,
  onNewSE: (se: SharedExpense) => void
): () => void {
  const knownSeIds = new Set(sharedExpenses.map((se) => se.id));

  const q = query(
    collection(db, `${BASE}/sharedExpenses`),
    where("participantEmails", "array-contains", currentUser.email),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added" && !knownSeIds.has(change.doc.id)) {
        knownSeIds.add(change.doc.id);
        const seData = change.doc.data();
        // Skip own creations — those are added locally by createSharedExpense.
        // This listener is only for invites from other users.
        if (seData.creatorUid === currentUser.uid) return;
        onNewSE({ id: change.doc.id, ...seData } as SharedExpense);
      }
    });
  });
}
