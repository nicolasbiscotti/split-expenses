const admin = require("firebase-admin");
const fs = require("fs");

// 1. Initialize Admin SDK
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

    // Detect ISO Date strings (YYYY-MM-DDTHH:mm:ss...)
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (typeof value === "string" && dateRegex.test(value)) {
      cleanData[key] = admin.firestore.Timestamp.fromDate(new Date(value));
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      cleanData[key] = prepareDataForFirestore(value);
    }
  }
  return cleanData;
}

async function importSharedExpenses(environmentId, backupFileName) {
  console.log(`Reading backup file: ${backupFileName}...`);

  const rawData = fs.readFileSync(backupFileName);
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
const BACKUP_FILE = "backup_shared_expenses_2024-05-20.json";

importSharedExpenses("prod", BACKUP_FILE).catch((err) => {
  console.error("❌ Import failed:", err);
});
