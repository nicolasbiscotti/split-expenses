/**
 * Backfill script: computes and writes `netPaid` and `expensesCount` for every
 * SharedExpense document that is missing them.
 *
 * These fields were introduced to fix balance/total calculations that were
 * broken when pagination only loaded a subset of expense/payment records.
 *
 * Algorithm (per SE):
 *   expensesCount = number of expense documents
 *   netPaid[email] = sum(expense.amount where paidByEmail == email)
 *                  + sum(payment.amount where fromEmail == email)
 *                  - sum(payment.amount where toEmail == email)
 *
 * Usage (emulator):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_PROJECT_ID=demo-split-expenses \
 *   FIRESTORE_DATA_ID=development \
 *   node scripts/firebase-admin-sdk/backfill-aggregates.js [--dry-run] [--force]
 *
 * Usage (production):
 *   FIREBASE_PROJECT_ID=<project-id> \
 *   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=<path-to-key.json> \
 *   FIRESTORE_DATA_ID=<namespace> \
 *   node scripts/firebase-admin-sdk/backfill-aggregates.js [--dry-run] [--force]
 *
 * Flags:
 *   --dry-run   Print what would be written without touching Firestore.
 *   --force     Update all SEs, even those that already have both fields.
 *               Default: skip SEs where netPaid and expensesCount already exist.
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    force:     { type: "boolean", default: false },
  },
});

const DRY_RUN = args["dry-run"];
const FORCE   = args.force;

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

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

const DATA_ID = process.env.FIRESTORE_DATA_ID;
if (!DATA_ID) {
  console.error("❌ FIRESTORE_DATA_ID is not set.");
  process.exit(1);
}

const BATCH_SIZE = 500;
const basePath   = `environments/${DATA_ID}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function backfillAggregates() {
  console.log(`Environment : ${DATA_ID}`);
  console.log(`Dry run     : ${DRY_RUN}`);
  console.log(`Force       : ${FORCE}`);
  console.log("");

  // 3 reads total — collectionGroup fetches all matching sub-collections in one round-trip.
  console.log("Fetching shared expenses, expenses, and payments in parallel...");
  const [seSnap, expSnap, paySnap] = await Promise.all([
    db.collection(`${basePath}/sharedExpenses`).get(),
    db.collectionGroup("expenses").get(),
    db.collectionGroup("payments").get(),
  ]);

  console.log(`Found ${seSnap.size} shared expense(s), ${expSnap.size} expense(s), ${paySnap.size} payment(s).`);
  console.log("");

  // Group expenses by SE ID (filter to this environment)
  const expensesBySe = new Map();
  for (const doc of expSnap.docs) {
    if (!doc.ref.path.startsWith(basePath)) continue;
    const seId = doc.ref.parent.parent.id;
    if (!expensesBySe.has(seId)) expensesBySe.set(seId, []);
    expensesBySe.get(seId).push(doc.data());
  }

  // Group payments by SE ID (filter to this environment)
  const paymentsBySe = new Map();
  for (const doc of paySnap.docs) {
    if (!doc.ref.path.startsWith(basePath)) continue;
    const seId = doc.ref.parent.parent.id;
    if (!paymentsBySe.has(seId)) paymentsBySe.set(seId, []);
    paymentsBySe.get(seId).push(doc.data());
  }

  // Build the list of updates to apply
  const ops = [];
  let skipped = 0;

  for (const seDoc of seSnap.docs) {
    const seData = seDoc.data();

    // Skip SEs that already have both fields unless --force is set
    if (!FORCE && seData.netPaid !== undefined && seData.expensesCount !== undefined) {
      skipped++;
      continue;
    }

    const expenses = expensesBySe.get(seDoc.id) ?? [];
    const payments = paymentsBySe.get(seDoc.id) ?? [];

    // Compute expensesCount
    const expensesCount = expenses.length;

    // Compute netPaid
    const netPaid = {};

    for (const exp of expenses) {
      const email = exp.paidByEmail;
      if (!email) continue;
      netPaid[email] = (netPaid[email] ?? 0) + exp.amount;
    }

    for (const pay of payments) {
      if (pay.fromEmail) {
        netPaid[pay.fromEmail] = (netPaid[pay.fromEmail] ?? 0) + pay.amount;
      }
      if (pay.toEmail) {
        netPaid[pay.toEmail] = (netPaid[pay.toEmail] ?? 0) - pay.amount;
      }
    }

    // Round to 2 decimal places to match client-side rounding
    for (const email of Object.keys(netPaid)) {
      netPaid[email] = Math.round(netPaid[email] * 100) / 100;
    }

    ops.push({
      ref: seDoc.ref,
      data: { expensesCount, netPaid },
      name: seData.name ?? seDoc.id,
      expenses: expenses.length,
      payments: payments.length,
    });
  }

  // Report plan
  console.log(`To update : ${ops.length} SE(s)`);
  console.log(`Skipped   : ${skipped} SE(s) (already have both fields; use --force to overwrite)`);
  console.log("");

  if (ops.length === 0) {
    console.log("✅ Nothing to do.");
    return;
  }

  for (const op of ops) {
    const netPaidEntries = Object.entries(op.data.netPaid)
      .map(([email, amount]) => `  ${email}: ${amount >= 0 ? "+" : ""}${amount}`)
      .join("\n");

    console.log(`SE: "${op.name}" (${op.expenses} expenses, ${op.payments} payments)`);
    console.log(`  expensesCount : ${op.data.expensesCount}`);
    console.log(`  netPaid       :\n${netPaidEntries || "  (empty)"}`);
    console.log("");
  }

  if (DRY_RUN) {
    console.log("Dry run — no writes performed.");
    return;
  }

  // Commit in batches of 500
  let written = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      batch.update(op.ref, op.data);
    }
    await batch.commit();
    written += ops.slice(i, i + BATCH_SIZE).length;
    console.log(`Committed batch: ${written}/${ops.length}`);
  }

  console.log("");
  console.log("✅ Backfill complete.");
}

backfillAggregates().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
