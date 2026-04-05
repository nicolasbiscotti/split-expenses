import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  or,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  runTransaction,
  arrayUnion,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { User } from "firebase/auth";

import type {
  Expense,
  Payment,
  Contact,
  UserProfile,
  SharedExpense,
  SharedExpenseParticipant,
} from "../types";

// Standard page size used by all paginated queries and future onSnapshot listeners.
export const PAGE_SIZE = 3;

// Opaque cursor type — keeps Firebase types out of the store layer.
export type FirestoreCursor = QueryDocumentSnapshot<DocumentData>;

export type ExpensePage = {
  data: Expense[];
  cursor: FirestoreCursor | null;
  hasMore: boolean;
};

export type PaymentPage = {
  data: Payment[];
  cursor: FirestoreCursor | null;
  hasMore: boolean;
};

const DATA_ID = import.meta.env.VITE_FIRESTORE_DATA_ID;
const BASE = `environments/${DATA_ID}`;

// --------------------------------------------------

// User Profile Operations

const usersCollectionPath = `${BASE}/users`;

export const userProfileService = {
  async ensureProfile(user: User): Promise<void> {
    const ref = doc(db, usersCollectionPath, user.uid);
    await setDoc(
      ref,
      {
        uid: user.uid,
        displayName: user.displayName ?? user.email ?? "Usuario",
        email: user.email ?? "",
        photoURL: user.photoURL ?? null,
      },
      { merge: true }
    );
  },

  async getProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(db, usersCollectionPath, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  },
};

// --------------------------------------------------

// Contact Operations

function getContactsCollectionPath(ownerUid: string): string {
  return `${usersCollectionPath}/${ownerUid}/contacts`;
}

export const contactService = {
  async getContacts(ownerUid: string): Promise<Contact[]> {
    const ref = collection(db, getContactsCollectionPath(ownerUid));
    const snap = await getDocs(ref);
    return snap.docs.map((d) => d.data() as Contact);
  },

  async addContact(ownerUid: string, contact: Contact): Promise<void> {
    const contactsPath = getContactsCollectionPath(ownerUid);
    // Use email as document ID to prevent duplicates
    const contactId = contact.email.replace(/[^a-zA-Z0-9]/g, "_");
    await setDoc(doc(db, contactsPath, contactId), {
      ...contact,
      addedAt: Timestamp.now(),
    });
  },

  async removeContact(ownerUid: string, contactId: string): Promise<void> {
    await deleteDoc(doc(db, getContactsCollectionPath(ownerUid), contactId));
  },
};

// --------------------------------------------------

// Expense Operations

const EXPENSES_COLLECTION_NAME = "expenses";

function getExpensesCollectionPath(sharedExpenseId: string): string {
  return `${BASE}/sharedExpenses/${sharedExpenseId}/${EXPENSES_COLLECTION_NAME}`;
}

export const expenseService = {
  async createExpense(expense: Omit<Expense, "id">): Promise<{
    expenseId: string;
    totalAmount: number;
    expensesCount: number;
    netPaid: Record<string, number>;
  }> {
    const seRef = doc(db, sharedExpensesCollectionPath, expense.sharedExpenseId);
    const newExpenseRef = doc(
      collection(db, getExpensesCollectionPath(expense.sharedExpenseId))
    );

    let totalAmount = 0;
    let expensesCount = 0;
    let netPaid: Record<string, number> = {};

    await runTransaction(db, async (transaction) => {
      const seSnap = await transaction.get(seRef);
      if (!seSnap.exists()) throw new Error("Shared expense not found");

      const seData = seSnap.data();
      totalAmount = ((seData.totalAmount as number) ?? 0) + expense.amount;
      expensesCount = ((seData.expensesCount as number) ?? 0) + 1;
      netPaid = { ...(seData.netPaid as Record<string, number> ?? {}) };
      netPaid[expense.paidByEmail] = (netPaid[expense.paidByEmail] ?? 0) + expense.amount;

      transaction.update(seRef, { totalAmount, expensesCount, netPaid });
      transaction.set(newExpenseRef, { ...expense, createdAt: Timestamp.now() });
    });

    return { expenseId: newExpenseRef.id, totalAmount, expensesCount, netPaid };
  },

  async getExpenses(
    sharedExpenseId: string,
    after?: FirestoreCursor | null
  ): Promise<ExpensePage> {
    if (sharedExpenseId === "") return { data: [], cursor: null, hasMore: false };

    const collectionRef = collection(db, getExpensesCollectionPath(sharedExpenseId));
    const constraints = after
      ? [orderBy("date", "desc"), startAfter(after), limit(PAGE_SIZE + 1)]
      : [orderBy("date", "desc"), limit(PAGE_SIZE + 1)];

    const snapshot = await getDocs(query(collectionRef, ...constraints));
    const hasMore = snapshot.docs.length > PAGE_SIZE;
    const docs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;

    return {
      data: docs.map((d) => ({ id: d.id, ...d.data() } as Expense)),
      cursor: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async deleteExpense(id: string, currentSharedExpenseId: string): Promise<{
    totalAmount: number;
    expensesCount: number;
    netPaid: Record<string, number>;
  }> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const expenseRef = doc(db, getExpensesCollectionPath(currentSharedExpenseId), id);
    const seRef = doc(db, sharedExpensesCollectionPath, currentSharedExpenseId);

    let totalAmount = 0;
    let expensesCount = 0;
    let netPaid: Record<string, number> = {};

    await runTransaction(db, async (transaction) => {
      const [expSnap, seSnap] = await Promise.all([
        transaction.get(expenseRef),
        transaction.get(seRef),
      ]);
      if (!expSnap.exists()) throw new Error("Expense not found");
      if (!seSnap.exists()) throw new Error("Shared expense not found");

      const exp = expSnap.data() as Expense;
      const seData = seSnap.data();
      totalAmount = ((seData.totalAmount as number) ?? 0) - exp.amount;
      expensesCount = Math.max(0, ((seData.expensesCount as number) ?? 0) - 1);
      netPaid = { ...(seData.netPaid as Record<string, number> ?? {}) };
      netPaid[exp.paidByEmail] = (netPaid[exp.paidByEmail] ?? 0) - exp.amount;

      transaction.delete(expenseRef);
      transaction.update(seRef, { totalAmount, expensesCount, netPaid });
    });

    return { totalAmount, expensesCount, netPaid };
  },
};

// --------------------------------------------------

// Payment Operations

const PAYMENTS_COLLECTION_NAME = "payments";

function getPaymentsCollectionPath(sharedExpenseId: string): string {
  return `${BASE}/sharedExpenses/${sharedExpenseId}/${PAYMENTS_COLLECTION_NAME}`;
}

export const paymentService = {
  async createPayment(payment: Omit<Payment, "id">): Promise<{
    paymentId: string;
    netPaid: Record<string, number>;
  }> {
    const seRef = doc(db, sharedExpensesCollectionPath, payment.sharedExpenseId);
    const newPaymentRef = doc(
      collection(db, getPaymentsCollectionPath(payment.sharedExpenseId))
    );

    let netPaid: Record<string, number> = {};

    await runTransaction(db, async (transaction) => {
      const seSnap = await transaction.get(seRef);
      if (!seSnap.exists()) throw new Error("Shared expense not found");

      const seData = seSnap.data();
      netPaid = { ...(seData.netPaid as Record<string, number> ?? {}) };
      netPaid[payment.fromEmail] = (netPaid[payment.fromEmail] ?? 0) + payment.amount;
      netPaid[payment.toEmail] = (netPaid[payment.toEmail] ?? 0) - payment.amount;

      transaction.update(seRef, { netPaid });
      transaction.set(newPaymentRef, { ...payment, createdAt: Timestamp.now() });
    });

    return { paymentId: newPaymentRef.id, netPaid };
  },

  async getPayments(
    sharedExpenseId: string,
    after?: FirestoreCursor | null
  ): Promise<PaymentPage> {
    if (sharedExpenseId === "") return { data: [], cursor: null, hasMore: false };

    const ref = collection(db, getPaymentsCollectionPath(sharedExpenseId));
    const constraints = after
      ? [orderBy("date", "desc"), startAfter(after), limit(PAGE_SIZE + 1)]
      : [orderBy("date", "desc"), limit(PAGE_SIZE + 1)];

    const snapshot = await getDocs(query(ref, ...constraints));
    const hasMore = snapshot.docs.length > PAGE_SIZE;
    const docs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;

    return {
      data: docs.map((d) => ({ id: d.id, ...d.data() } as Payment)),
      cursor: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
    };
  },

  async deletePayment(id: string, currentSharedExpenseId: string): Promise<{
    netPaid: Record<string, number>;
  }> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const paymentRef = doc(db, getPaymentsCollectionPath(currentSharedExpenseId), id);
    const seRef = doc(db, sharedExpensesCollectionPath, currentSharedExpenseId);

    let netPaid: Record<string, number> = {};

    await runTransaction(db, async (transaction) => {
      const [paySnap, seSnap] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(seRef),
      ]);
      if (!paySnap.exists()) throw new Error("Payment not found");
      if (!seSnap.exists()) throw new Error("Shared expense not found");

      const pay = paySnap.data() as Payment;
      const seData = seSnap.data();
      netPaid = { ...(seData.netPaid as Record<string, number> ?? {}) };
      netPaid[pay.fromEmail] = (netPaid[pay.fromEmail] ?? 0) - pay.amount;
      netPaid[pay.toEmail] = (netPaid[pay.toEmail] ?? 0) + pay.amount;

      transaction.delete(paymentRef);
      transaction.update(seRef, { netPaid });
    });

    return { netPaid };
  },
};

// --------------------------------------------------

// Shared Expenses Operations

const sharedExpensesCollectionPath = `${BASE}/sharedExpenses`;

export const sharedExpenseService = {
  create: async (data: Omit<SharedExpense, "id">): Promise<string> => {
    const ref = collection(db, sharedExpensesCollectionPath);
    const docRef = await addDoc(ref, data);
    return docRef.id;
  },

  getForUser: async (uid: string, email: string): Promise<SharedExpense[]> => {
    const ref = collection(db, sharedExpensesCollectionPath);
    const snapshot = await getDocs(
      query(
        ref,
        or( where("participantUids", "array-contains", uid),where("participantEmails", "array-contains", email)),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as SharedExpense)
    );
  },

  getByParticipantEmail: async (uid: string, email: string): Promise<SharedExpense[]> => {
    const ref = collection(db, sharedExpensesCollectionPath);
    const snapshot = await getDocs(
      query(ref, or( where("participantUids", "array-contains", uid),where("participantEmails", "array-contains", email)))
    );
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as SharedExpense)
    );
  },

  resolveParticipantUid: async (
    seId: string,
    email: string,
    uid: string
  ): Promise<void> => {
    const seRef = doc(db, sharedExpensesCollectionPath, seId);
    const seSnap = await getDoc(seRef);
    if (!seSnap.exists()) return;

    const se = seSnap.data() as SharedExpense;
    const updatedParticipants: SharedExpenseParticipant[] = se.participants.map(
      (p) => (p.email === email ? { ...p, uid } : p)
    );

    await updateDoc(seRef, {
      participants: updatedParticipants,
      participantUids: arrayUnion(uid),
    });
  },

  update: async (
    id: string,
    updates: Partial<SharedExpense>
  ): Promise<void> => {
    await updateDoc(doc(db, sharedExpensesCollectionPath, id), updates);
  },
};

// --------------------------------------------------
