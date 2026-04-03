import admin from "firebase-admin";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

// Environment variables:
//   FIREBASE_PROJECT_ID        — required
//   FIRESTORE_DATA_ID          — required (namespace, e.g. "prod" or "development")
//   FIRESTORE_EMULATOR_HOST    — set to 127.0.0.1:8080 to use local emulator
//   FIREBASE_SERVICE_ACCOUNT_KEY_PATH — path to service account JSON (prod only)
//
// Example (emulator):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//   FIREBASE_PROJECT_ID=demo-split-expenses \
//   FIRESTORE_DATA_ID=development \
//   node scripts/firebase-admin-sdk/backup.js

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
} else {
  const serviceAccount = JSON.parse(
    readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH, "utf8"),
  );
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

/**
 * Recursively converts Firestore Timestamps to ISO strings so the output
 * is plain JSON.
 */
function transformData(data) {
  const out = { ...data };
  for (const key in out) {
    if (out[key] instanceof admin.firestore.Timestamp) {
      out[key] = out[key].toDate().toISOString();
    } else if (typeof out[key] === "object" && out[key] !== null) {
      out[key] = transformData(out[key]);
    }
  }
  return out;
}

async function backupSharedExpenses(environmentId) {
  console.log(`Starting backup for environment: ${environmentId}...`);

  const basePath = `environments/${environmentId}`;

  // 3 reads total — collectionGroup fetches all matching sub-collections
  // across the entire project in a single round-trip.
  console.log("Fetching shared expenses, expenses, and payments in parallel...");
  const [seSnap, expSnap, paySnap] = await Promise.all([
    db.collection(`${basePath}/sharedExpenses`).get(),
    db.collectionGroup("expenses").get(),
    db.collectionGroup("payments").get(),
  ]);

  if (seSnap.empty) {
    console.log("No Shared Expenses found.");
    return;
  }

  // Group expenses by SE ID, filtering to this environment only
  const expensesBySe = new Map();
  for (const doc of expSnap.docs) {
    if (!doc.ref.path.startsWith(basePath)) continue;
    const seId = doc.ref.parent.parent.id;
    if (!expensesBySe.has(seId)) expensesBySe.set(seId, []);
    expensesBySe.get(seId).push({ id: doc.id, ...transformData(doc.data()) });
  }

  // Group payments by SE ID, filtering to this environment only
  const paymentsBySe = new Map();
  for (const doc of paySnap.docs) {
    if (!doc.ref.path.startsWith(basePath)) continue;
    const seId = doc.ref.parent.parent.id;
    if (!paymentsBySe.has(seId)) paymentsBySe.set(seId, []);
    paymentsBySe.get(seId).push({ id: doc.id, ...transformData(doc.data()) });
  }

  const backupData = seSnap.docs.map((doc) => ({
    id: doc.id,
    ...transformData(doc.data()),
    expenses: expensesBySe.get(doc.id) ?? [],
    payments: paymentsBySe.get(doc.id) ?? [],
  }));

  mkdirSync("./backup-data", { recursive: true });
  const fileName = `./backup-data/backup_${environmentId}_${new Date().toISOString().split("T")[0]}.json`;
  writeFileSync(fileName, JSON.stringify(backupData, null, 2));

  const totalExpenses = backupData.reduce((n, se) => n + se.expenses.length, 0);
  const totalPayments = backupData.reduce((n, se) => n + se.payments.length, 0);

  console.log("------------------------------------------");
  console.log(`✅ Backup saved to: ${fileName}`);
  console.log(`   Shared expenses : ${backupData.length}`);
  console.log(`   Expenses        : ${totalExpenses}`);
  console.log(`   Payments        : ${totalPayments}`);
  console.log(`   Firestore reads : 3`);
}

backupSharedExpenses(process.env.FIRESTORE_DATA_ID).catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
