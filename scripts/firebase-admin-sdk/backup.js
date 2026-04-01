const admin = require("firebase-admin");
const fs = require("fs");

// 1. Initialize Admin SDK
// Replace 'serviceAccountKey.json' with the path to your downloaded file
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Helper to handle Firestore types that don't JSON stringify well
 */
function transformData(data) {
  const transformed = { ...data };
  for (const key in transformed) {
    if (transformed[key] instanceof admin.firestore.Timestamp) {
      transformed[key] = transformed[key].toDate().toISOString();
    } else if (
      typeof transformed[key] === "object" &&
      transformed[key] !== null
    ) {
      transformed[key] = transformData(transformed[key]);
    }
  }
  return transformed;
}

async function backupSharedExpenses(environmentId) {
  console.log(`Starting backup for environment: ${environmentId}...`);

  const backupData = [];

  // Path based on your rules: environments/{envId}/sharedExpenses
  const sharedExpensesRef = db
    .collection("environments")
    .doc(environmentId)
    .collection("sharedExpenses");
  const snapshot = await sharedExpensesRef.get();

  if (snapshot.empty) {
    console.log("No Shared Expenses found.");
    return;
  }

  for (const doc of snapshot.docs) {
    const seData = transformData(doc.data());
    const seId = doc.id;

    console.log(`- Fetching sub-collections for: ${seData.name || seId}`);

    // Fetch Expenses sub-collection
    const expensesSnapshot = await doc.ref.collection("expenses").get();
    const expenses = expensesSnapshot.docs.map((d) => ({
      id: d.id,
      ...transformData(d.data()),
    }));

    // Fetch Payments sub-collection
    const paymentsSnapshot = await doc.ref.collection("payments").get();
    const payments = paymentsSnapshot.docs.map((d) => ({
      id: d.id,
      ...transformData(d.data()),
    }));

    // Combine into one object
    backupData.push({
      id: seId,
      ...seData,
      expenses: expenses,
      payments: payments,
    });
  }

  // Save to file
  const fileName = `backup_shared_expenses_${new Date().toISOString().split("T")[0]}.json`;
  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2));

  console.log("------------------------------------------");
  console.log(`✅ Success! Backup saved to: ${fileName}`);
  console.log(`Total Shared Expenses backed up: ${backupData.length}`);
}

// EXECUTION
// Change 'prod' to whatever your {dataId} environment name is
backupSharedExpenses("prod").catch((err) => {
  console.error("❌ Backup failed:", err);
});
