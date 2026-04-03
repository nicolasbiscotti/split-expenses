/**
 * Field rename migration for issue #008:
 *   - expenses:  payerEmail  → paidByEmail  |  adminUid → creatorUid
 *   - payments:  adminUid    → creatorUid
 *   - SE arrays: converts numeric-keyed objects back to real JS arrays
 *                (participants, participantUids, participantEmails)
 *
 * Reads from a backup JSON produced by backup.js (no mapping file needed).
 * The backup already contains the correct emails and UIDs from the first migration.
 *
 * Usage:
 *   # Dry-run — writes <input>.renamed.json, no Firestore writes
 *   node scripts/firebase-admin-sdk/rename-fields.js \
 *     --input ./backup-data/backup_<env>_<date>.json \
 *     --dry-run
 * 
 *   TIP: compare using Beyond Compare backup with renamed
 *
 *   # Apply to emulator
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_PROJECT_ID=demo-split-expenses \
 *   FIRESTORE_DATA_ID=development \
 *   node scripts/firebase-admin-sdk/rename-fields.js \
 *     --input ./backup-data/backup_<env>_<date>.json
 *
 *   # Apply to production
 *   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json \
 *   FIRESTORE_DATA_ID=prod \
 *   node scripts/firebase-admin-sdk/rename-fields.js \
 *     --input ./backup-data/backup_prod_<date>.json
 *
 * Firestore write cost: ceil(total_documents / 500) batch commits.
 */

import admin from "firebase-admin";
import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    input:     { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (!args.input) {
  console.error("Usage: rename-fields.js --input <backup.json> [--dry-run]");
  process.exit(1);
}

const isDryRun = args["dry-run"];

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

if (!isDryRun) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  } else {
    const serviceAccount = JSON.parse(
      readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH, "utf8"),
    );
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Firestore Admin SDK serializes arrays as numeric-keyed objects in JSON
 * exports ({"0": "a", "1": "b"}). This converts them back to real arrays.
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return [];
    if (keys.every((k) => /^\d+$/.test(k))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => value[k]);
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

function transformSE(se) {
  const { expenses: rawExpenses, payments: rawPayments, ...seFields } = se;

  // Convert SE-level arrays stored as numeric-keyed objects
  const seDoc = {
    ...seFields,
    participants:      toArray(seFields.participants),
    participantUids:   toArray(seFields.participantUids),
    participantEmails: toArray(seFields.participantEmails),
  };

  // Rename expense fields: payerEmail → paidByEmail, adminUid → creatorUid
  // Falls back to the already-renamed field for idempotency.
  const expenses = toArray(rawExpenses).map((exp) => {
    const { payerEmail, adminUid, ...rest } = exp;
    return {
      ...rest,
      paidByEmail: payerEmail ?? rest.paidByEmail ?? "",
      creatorUid:  adminUid   ?? rest.creatorUid  ?? "",
    };
  });

  // Rename payment fields: adminUid → creatorUid
  // Falls back to the already-renamed field for idempotency.
  const payments = toArray(rawPayments).map((pay) => {
    const { adminUid, ...rest } = pay;
    return {
      ...rest,
      creatorUid: adminUid ?? rest.creatorUid ?? "",
    };
  });

  return { seDoc, expenses, payments };
}

// ---------------------------------------------------------------------------
// Write to Firestore — batched writes, max 500 ops per commit
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

async function writeToFirestore(environmentId, backupData) {
  const db = admin.firestore();
  const ops = [];

  for (const se of backupData) {
    const { seDoc, expenses, payments } = transformSE(se);
    const seRef = db
      .collection("environments")
      .doc(environmentId)
      .collection("sharedExpenses")
      .doc(se.id);

    const { id: _id, ...docToWrite } = seDoc;
    ops.push({ ref: seRef, doc: docToWrite });

    for (const exp of expenses) {
      const { id: expId, ...expDoc } = exp;
      ops.push({ ref: seRef.collection("expenses").doc(expId), doc: expDoc });
    }
    for (const pay of payments) {
      const { id: payId, ...payDoc } = pay;
      ops.push({ ref: seRef.collection("payments").doc(payId), doc: payDoc });
    }
  }

  console.log(`Total documents to write: ${ops.length}`);

  let batchNum = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    batchNum++;
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, doc } of chunk) {
      batch.set(ref, doc);
    }
    await batch.commit();
    console.log(`  Batch ${batchNum}: committed ${chunk.length} write(s)`);
  }

  console.log(`Firestore write round-trips: ${batchNum}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const environmentId = process.env.FIRESTORE_DATA_ID;
  if (!isDryRun && !environmentId) {
    console.error("FIRESTORE_DATA_ID is required when not using --dry-run");
    process.exit(1);
  }

  const backupData = JSON.parse(readFileSync(args.input, "utf8"));
  console.log(`Loaded ${backupData.length} shared expense(s) from ${args.input}`);

  if (isDryRun) {
    const preview = backupData.map((se) => {
      const { seDoc, expenses, payments } = transformSE(se);
      return { ...seDoc, expenses, payments };
    });
    const outFile = args.input.replace(".json", ".renamed.json");
    writeFileSync(outFile, JSON.stringify(preview, null, 2));
    console.log(`\n[dry-run] Preview written to: ${outFile}`);
    return;
  }

  console.log(`\nWriting to Firestore namespace: ${environmentId}`);
  await writeToFirestore(environmentId, backupData);

  console.log("------------------------------------------");
  console.log("✅ Field rename complete!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
