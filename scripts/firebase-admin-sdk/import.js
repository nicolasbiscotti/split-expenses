import admin from "firebase-admin";
import { readFileSync } from "fs";

// to test the script with Emulators set with export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (unset FIRESTORE_EMULATOR_HOST):
// FIREBASE_PROJECT_ID=the-project-id (required)
// FIRESTORE_DATA_ID=development (required)
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 
// and run:
// node scripts/firebase-admin-sdk/backup.js`

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(
    `Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`,
  );
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
} else {
  const serviceAccount = JSON.parse(
    readFileSync("./serviceAccountKey.json", "utf8"),
  );
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

/**
 * Helper to convert ISO strings back to Firestore Timestamps
 * and clean up the data for insertion.
 */
function prepareDataForFirestore(data) {
  const cleanData = { ...data };

  // Remove the 'id', 'expenses', and 'payments' keys so they don't
  // get saved as fields inside the document itself
  delete cleanData.id;
  delete cleanData.expenses;
  delete cleanData.payments;

  for (const key in cleanData) {
    const value = cleanData[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      cleanData[key] = prepareDataForFirestore(value);
    }
  }
  return cleanData;
}

async function importSharedExpenses(environmentId, backupFileName) {
  console.log(`Reading backup file: ${backupFileName}...`);

  const rawData = readFileSync(backupFileName);
  const backupData = JSON.parse(rawData);

  console.log(`Starting import for ${backupData.length} Shared Expenses...`);

  for (const item of backupData) {
    const seId = item.id;
    const seRef = db
      .collection("environments")
      .doc(environmentId)
      .collection("sharedExpenses")
      .doc(seId);

    console.log(`- Importing: ${item.name || seId}`);

    // 1. Save the main Shared Expense document
    const mainDocData = prepareDataForFirestore(item);
    await seRef.set(mainDocData);

    // 2. Import Expenses Sub-collection
    if (item.expenses && item.expenses.length > 0) {
      for (const exp of item.expenses) {
        const expId = exp.id;
        const expData = prepareDataForFirestore(exp);
        await seRef.collection("expenses").doc(expId).set(expData);
      }
      console.log(`  -> Restored ${item.expenses.length} expenses`);
    }

    // 3. Import Payments Sub-collection
    if (item.payments && item.payments.length > 0) {
      for (const pay of item.payments) {
        const payId = pay.id;
        const payData = prepareDataForFirestore(pay);
        await seRef.collection("payments").doc(payId).set(payData);
      }
      console.log(`  -> Restored ${item.payments.length} payments`);
    }
  }

  console.log("------------------------------------------");
  console.log("✅ Import Complete!");
}

// EXECUTION
// Change the filename to match your actual backup file
const BACKUP_FILE = "./backup-data/backup_shared_expenses_2026-04-01.json";

importSharedExpenses(process.env.FIRESTORE_DATA_ID, BACKUP_FILE).catch(
  (err) => {
    console.error("❌ Import failed:", err);
  },
);
