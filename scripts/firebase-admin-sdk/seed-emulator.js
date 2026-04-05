/**
 * Seed script: creates one shared expense with configurable numbers of
 * expenses and payments in the local Firestore emulator.
 *
 * Useful for testing pagination (PAGE_SIZE = 20) and UI behaviour with
 * realistic data volumes.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_PROJECT_ID=demo-split-expenses \
 *   FIRESTORE_DATA_ID=development \
 *   SEED_PARTICIPANT_1="email1@example.com:DisplayName1:uid1" \
 *   SEED_PARTICIPANT_2="email2@example.com:DisplayName2:uid2" \
 *   node scripts/firebase-admin-sdk/seed-emulator.js \
 *     [--expenses 40] \
 *     [--payments 25] \
 *     [--name "Vacaciones 2026"]
 *
 * Requires FIRESTORE_EMULATOR_HOST — refuses to run against production.
 * 
 *  A few notes:
  - The script refuses to run if FIRESTORE_EMULATOR_HOST is not set — no accidental production writes.
  - Uses a single db.batch() commit (66 ops, well under the 500 limit).
  - Expenses are spread across the last 40 days so the orderBy("date", "desc") ordering works correctly and pagination cuts at the
   right boundary.
  - The two participant UIDs match the ones from your existing backup data — adjust them in the PARTICIPANTS array if your
  emulator users differ.
 */

import admin from "firebase-admin";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Safety guard — emulator only
// ---------------------------------------------------------------------------

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("❌ FIRESTORE_EMULATOR_HOST is not set. This script only runs against the local emulator.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    expenses: { type: "string", default: "40" },
    payments: { type: "string", default: "25" },
    name:     { type: "string", default: "Grupo de prueba (seed)" },
  },
});

const NUM_EXPENSES = Math.max(1, parseInt(args.expenses, 10));
const NUM_PAYMENTS = Math.max(1, parseInt(args.payments, 10));
const SE_NAME      = args.name;

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Seed data config
// ---------------------------------------------------------------------------

const ENV_ID = process.env.FIRESTORE_DATA_ID;
if (!ENV_ID) {
  console.error("❌ FIRESTORE_DATA_ID is required");
  process.exit(1);
}

// Participants are read from env vars to avoid committing real UIDs/emails.
// Format: "email:displayName:uid"  (uid is optional for non-registered participants)
// Example:
//   SEED_PARTICIPANT_1="alice@example.com:Alice:someFirebaseUid1"
//   SEED_PARTICIPANT_2="bob@example.com:Bob:someFirebaseUid2"

function parseParticipant(envVar, envName) {
  if (!envVar) {
    console.error(`❌ ${envName} is required. Format: "email:displayName:uid"`);
    process.exit(1);
  }
  const [email, displayName, uid] = envVar.split(":");
  if (!email || !displayName) {
    console.error(`❌ ${envName} must be in "email:displayName:uid" format`);
    process.exit(1);
  }
  return uid ? { email, displayName, uid } : { email, displayName };
}

const PARTICIPANTS = [
  parseParticipant(process.env.SEED_PARTICIPANT_1, "SEED_PARTICIPANT_1"),
  parseParticipant(process.env.SEED_PARTICIPANT_2, "SEED_PARTICIPANT_2"),
];

const CREATOR = PARTICIPANTS[0];

const EXPENSE_DESCRIPTIONS = [
  "Supermercado", "Cena", "Almuerzo", "Transporte", "Combustible",
  "Alojamiento", "Entradas", "Farmacia", "Café", "Taxi",
  "Seguro", "Servicios", "Internet", "Suscripción", "Ropa",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns an ISO date string within the last `days` days, descending order */
function pastDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(randomBetween(8, 22), randomBetween(0, 59));
  return d.toISOString();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Build documents
// ---------------------------------------------------------------------------

function buildExpenses(seId, count) {
  return Array.from({ length: count }, (_, i) => ({
    sharedExpenseId: seId,
    creatorUid:  CREATOR.uid,
    paidByEmail: pick(PARTICIPANTS).email,
    amount:      randomBetween(1000, 50000) * 10,  // e.g. $10,000 – $500,000
    description: EXPENSE_DESCRIPTIONS[i % EXPENSE_DESCRIPTIONS.length] + (i >= EXPENSE_DESCRIPTIONS.length ? ` ${Math.floor(i / EXPENSE_DESCRIPTIONS.length) + 1}` : ""),
    date:        pastDate(count - i),              // oldest first so newest-first ordering works
    createdAt:   admin.firestore.Timestamp.now(),
  }));
}

function buildPayments(seId, count) {
  return Array.from({ length: count }, (_, i) => {
    const [from, to] = i % 2 === 0
      ? [PARTICIPANTS[0], PARTICIPANTS[1]]
      : [PARTICIPANTS[1], PARTICIPANTS[0]];
    return {
      sharedExpenseId: seId,
      creatorUid: CREATOR.uid,
      fromEmail:  from.email,
      toEmail:    to.email,
      amount:     randomBetween(500, 20000) * 10,
      date:       pastDate(count - i),
      createdAt:  admin.firestore.Timestamp.now(),
    };
  });
}

// ---------------------------------------------------------------------------
// Write — single batch (≤ 500 ops)
// ---------------------------------------------------------------------------

async function seed() {
  const totalOps = 1 + NUM_EXPENSES + NUM_PAYMENTS;
  if (totalOps > 500) {
    console.warn(`⚠️  ${totalOps} ops exceeds single-batch limit (500). Split into multiple batches if needed.`);
  }

  const seRef = db
    .collection("environments").doc(ENV_ID)
    .collection("sharedExpenses").doc();

  const seId = seRef.id;
  const totalAmount = 0; // will be updated by the app on first real expense

  const seDoc = {
    name:              SE_NAME,
    description:       `Seeded with ${NUM_EXPENSES} expenses and ${NUM_PAYMENTS} payments`,
    type:              "unique",
    status:            "active",
    creatorUid:        CREATOR.uid,
    participants:      PARTICIPANTS,
    participantUids:   PARTICIPANTS.filter(p => p.uid).map(p => p.uid),
    participantEmails: PARTICIPANTS.map(p => p.email),
    totalAmount,
    createdAt:         admin.firestore.Timestamp.now(),
  };

  const expenses = buildExpenses(seId, NUM_EXPENSES);
  const payments = buildPayments(seId, NUM_PAYMENTS);

  // Compute totalAmount from generated expenses
  seDoc.totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  console.log(`\nCreating SE "${SE_NAME}" (id: ${seId})`);
  console.log(`  Expenses : ${NUM_EXPENSES}`);
  console.log(`  Payments : ${NUM_PAYMENTS}`);
  console.log(`  Total ops: ${totalOps}`);

  const batch = db.batch();

  batch.set(seRef, seDoc);

  for (const exp of expenses) {
    batch.set(seRef.collection("expenses").doc(), exp);
  }
  for (const pay of payments) {
    batch.set(seRef.collection("payments").doc(), pay);
  }

  await batch.commit();

  console.log("\n------------------------------------------");
  console.log("✅ Seed complete!");
  console.log(`   Open the app and select "${SE_NAME}" to test pagination.`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
