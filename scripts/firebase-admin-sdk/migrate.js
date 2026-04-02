/**
 * Migration script: transforms old-format shared expense data to the new
 * multi-user format and writes it to Firestore.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_PROJECT_ID=<project-id> \
 *   FIRESTORE_DATA_ID=<namespace> \
 *   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=<path-to-the-file> \
 *   node scripts/firebase-admin-sdk/migrate.js \
 *     --input ./backup-data/old-backup.json \
 *     --mapping ./scripts/firebase-admin-sdk/migration-mapping.json \
 *     [--dry-run]
 *
 * --dry-run prints the transformed JSON to stdout without writing to Firestore.
 *
 * See migration-mapping.example.json for the mapping file format.
 */

import admin from "firebase-admin";
import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    input: { type: "string" },
    mapping: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (!args.input || !args.mapping) {
  console.error("Usage: migrate.js --input <backup.json> --mapping <mapping.json> [--dry-run]");
  process.exit(1);
}

const isDryRun = args["dry-run"];

// ---------------------------------------------------------------------------
// Firebase init (same pattern as backup.js and import.js)
// ---------------------------------------------------------------------------

if (!isDryRun) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  } else {
    const serviceAccount = JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH, "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Firestore sometimes serializes arrays as objects with numeric string keys
 * (e.g. {"0": "a", "1": "b"}). This converts them back to real arrays.
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return [];
    const isNumericKeys = keys.every((k) => /^\d+$/.test(k));
    if (isNumericKeys) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => value[k]);
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Transforms a single old-format shared expense object into the new format.
 *
 * @param {object} oldSE - The old shared expense (with expenses[] and payments[] embedded)
 * @param {object} mapping - { creatorUid, participants: { oldId: { email, displayName, uid? } } }
 * @returns {object} New-format shared expense with expenses[] and payments[] embedded
 */
function transformSharedExpense(oldSE, mapping) {
  const { creatorUid, participants: participantMap } = mapping;

  // Build the participants array from the old participantIds list
  const oldParticipantIds = toArray(oldSE.participantIds);
  const seenEmails = new Set();
  const participants = [];

  for (const oldId of oldParticipantIds) {
    const mapped = participantMap[oldId];
    if (!mapped) {
      console.warn(`  [WARN] No mapping found for participantId "${oldId}" in SE "${oldSE.name || oldSE.id}" — skipping`);
      continue;
    }
    if (seenEmails.has(mapped.email)) continue; // deduplicate
    seenEmails.add(mapped.email);

    const participant = { email: mapped.email, displayName: mapped.displayName };
    if (mapped.uid) participant.uid = mapped.uid;
    participants.push(participant);
  }

  const participantUids = participants
    .filter((p) => p.uid)
    .map((p) => p.uid);

  const participantEmails = participants.map((p) => p.email);

  // Transform expenses
  const expenses = (oldSE.expenses ?? []).map((exp) => {
    const mapped = participantMap[exp.payerId];
    if (!mapped) {
      console.warn(`  [WARN] No mapping for payerId "${exp.payerId}" in expense "${exp.description}" — leaving blank`);
    }
    const { payerId: _removed, ...rest } = exp;
    return {
      ...rest,
      payerEmail: mapped?.email ?? "",
      adminUid: creatorUid,
    };
  });

  // Transform payments
  const payments = (oldSE.payments ?? []).map((pay) => {
    const mappedFrom = participantMap[pay.fromId];
    const mappedTo = participantMap[pay.toId];
    if (!mappedFrom) console.warn(`  [WARN] No mapping for fromId "${pay.fromId}"`);
    if (!mappedTo)   console.warn(`  [WARN] No mapping for toId "${pay.toId}"`);
    const { fromId: _f, toId: _t, ...rest } = pay;
    return {
      ...rest,
      fromEmail: mappedFrom?.email ?? "",
      toEmail: mappedTo?.email ?? "",
      adminUid: creatorUid,
    };
  });

  // Build new SE (drop old fields, add new ones)
  const { participantIds: _old, ...seRest } = oldSE;

  return {
    ...seRest,
    creatorUid,
    participants,
    participantUids,
    participantEmails,
    expenses,
    payments,
  };
}

// ---------------------------------------------------------------------------
// Write to Firestore
// ---------------------------------------------------------------------------

async function writeToFirestore(environmentId, transformedSEs) {
  const db = admin.firestore();

  for (const se of transformedSEs) {
    const seRef = db
      .collection("environments")
      .doc(environmentId)
      .collection("sharedExpenses")
      .doc(se.id);

    console.log(`- Writing SE: ${se.name || se.id}`);

    // Main SE document (without embedded sub-collections)
    const { id: _id, expenses, payments, ...seDoc } = se;
    await seRef.set(seDoc);

    for (const exp of expenses) {
      const { id: expId, ...expDoc } = exp;
      await seRef.collection("expenses").doc(expId).set(expDoc);
    }
    console.log(`  -> ${expenses.length} expense(s) written`);

    for (const pay of payments) {
      const { id: payId, ...payDoc } = pay;
      await seRef.collection("payments").doc(payId).set(payDoc);
    }
    console.log(`  -> ${payments.length} payment(s) written`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const environmentId = process.env.FIRESTORE_DATA_ID;
  if (!isDryRun && !environmentId) {
    console.error("FIRESTORE_DATA_ID env var is required when not using --dry-run");
    process.exit(1);
  }

  const oldData = JSON.parse(readFileSync(args.input, "utf8"));
  const mapping = JSON.parse(readFileSync(args.mapping, "utf8"));

  console.log(`Transforming ${oldData.length} shared expense(s)...`);
  const transformed = oldData.map((se) => transformSharedExpense(se, mapping));

  if (isDryRun) {
    const outFile = args.input.replace(".json", ".migrated.json");
    writeFileSync(outFile, JSON.stringify(transformed, null, 2));
    console.log(`\n[dry-run] Transformed data written to: ${outFile}`);
    return;
  }

  console.log(`\nWriting to Firestore namespace: ${environmentId}`);
  await writeToFirestore(environmentId, transformed);

  console.log("------------------------------------------");
  console.log("✅ Migration complete!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
