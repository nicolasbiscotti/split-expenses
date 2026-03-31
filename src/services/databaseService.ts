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
  Timestamp,
  runTransaction,
  arrayUnion,
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
  async createExpense(expense: Omit<Expense, "id">): Promise<string> {
    const collectionRef = collection(
      db,
      getExpensesCollectionPath(expense.sharedExpenseId)
    );

    let docRef;

    await runTransaction(db, async () => {
      const expenseList = await this.getExpenses(expense.sharedExpenseId);

      const seTotalAmount = expenseList.reduce(
        (total, e) => total + e.amount,
        0
      );

      await sharedExpenseService.update(expense.sharedExpenseId, {
        totalAmount: seTotalAmount + expense.amount,
      });

      docRef = await addDoc(collectionRef, {
        ...expense,
        createdAt: Timestamp.now(),
      });
    });

    return docRef!.id;
  },

  async getExpenses(sharedExpenseId: string): Promise<Expense[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const collectionRef = collection(
      db,
      getExpensesCollectionPath(sharedExpenseId)
    );

    const querySnapshot = await getDocs(
      query(collectionRef, orderBy("date", "desc"))
    );

    return querySnapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as Expense)
    );
  },

  async deleteExpense(id: string, currentSharedExpenseId: string): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const ref = doc(db, getExpensesCollectionPath(currentSharedExpenseId), id);
    await deleteDoc(ref);
  },
};

// --------------------------------------------------

// Payment Operations

const PAYMENTS_COLLECTION_NAME = "payments";

function getPaymentsCollectionPath(sharedExpenseId: string): string {
  return `${BASE}/sharedExpenses/${sharedExpenseId}/${PAYMENTS_COLLECTION_NAME}`;
}

export const paymentService = {
  async createPayment(payment: Omit<Payment, "id">): Promise<string> {
    const ref = collection(
      db,
      getPaymentsCollectionPath(payment.sharedExpenseId)
    );

    const docRef = await addDoc(ref, {
      ...payment,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getPayments(sharedExpenseId: string): Promise<Payment[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const ref = collection(db, getPaymentsCollectionPath(sharedExpenseId));

    const querySnapshot = await getDocs(
      query(ref, orderBy("date", "desc"))
    );

    return querySnapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as Payment)
    );
  },

  async deletePayment(id: string, currentSharedExpenseId: string): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const ref = doc(db, getPaymentsCollectionPath(currentSharedExpenseId), id);
    await deleteDoc(ref);
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
