import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

import type { Expense, Payment, Participant, SharedExpense } from "../types";

const SHARED_EXPENSES_COLLECTION_NAME = "sharedExpenses";

// Participant Operations
export const participantService = {
  async createParticipant(
    participant: Omit<Participant, "id">
  ): Promise<string> {
    const docRef = await addDoc(collection(db, "participants"), {
      ...participant,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async createParticipantList(): Promise<string[]> {
    const participantList = [
      { name: "Fer" },
      { name: "Seba" },
      { name: "Nata" },
    ];

    const promises = participantList.map(
      (participant: Omit<Participant, "id">) =>
        addDoc(collection(db, "participants"), {
          ...participant,
          createdAt: Timestamp.now(),
        })
    );

    const docRef = await Promise.all(promises);

    return docRef.map((ref) => ref.id);
  },

  async getParticipants(): Promise<Participant[]> {
    const querySnapshot = await getDocs(query(collection(db, "participants")));

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Participant)
    );
  },
};

// --------------------------------------------------

// Expense Operations
const EXPENSES_COLLECTION_NAME = "expenses";

function getExpensesCollectionPath(sharedExpenseId: string) {
  return `environments/${
    import.meta.env.VITE_FIRESTORE_DATA_ID
  }/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${EXPENSES_COLLECTION_NAME}`;
}

async function getExpensesCollectionRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const expenseService = {
  // Create new expense
  async createExpense(expense: Omit<Expense, "id">): Promise<string> {
    const collectionRef = await getExpensesCollectionRef(
      getExpensesCollectionPath(expense.sharedExpenseId)
    );

    const docRef = await addDoc(collectionRef, {
      ...expense,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Get all expenses
  async getExpenses(sharedExpenseId: string): Promise<Expense[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const collectionRef = await getExpensesCollectionRef(
      getExpensesCollectionPath(sharedExpenseId)
    );

    const querySnapshot = await getDocs(
      query(collectionRef, orderBy("date", "desc"))
    );

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Expense)
    );
  },

  // Get expenses by participant
  async getExpensesByUser(participantId: string): Promise<Expense[]> {
    const q = query(
      collection(db, EXPENSES_COLLECTION_NAME),
      where("payerId", "==", participantId),
      orderBy("date", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Expense)
    );
  },

  // Update expense
  async updateExpense(
    id: string,
    updates: Partial<Omit<Expense, "id">>
  ): Promise<void> {
    const docRef = doc(db, EXPENSES_COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  // Delete expense
  async deleteExpense(
    id: string,
    currentSharedExpenseId: string
  ): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const docRef = doc(
      db,
      getExpensesCollectionPath(currentSharedExpenseId),
      id
    );
    await deleteDoc(docRef);
  },
};

// --------------------------------------------------

// Payment Operations

const PAYMENTS_COLLECTION_NAME = "payments";

function getPaymentsCollectionPath(sharedExpenseId: string) {
  return `environments/${
    import.meta.env.VITE_FIRESTORE_DATA_ID
  }/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${PAYMENTS_COLLECTION_NAME}`;
}

async function getPaymentsCollectionRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const paymentService = {
  async createPayment(payment: Omit<Payment, "id">): Promise<string> {
    const paymentsCollectionRef = await getPaymentsCollectionRef(
      getPaymentsCollectionPath(payment.sharedExpenseId)
    );

    const docRef = await addDoc(paymentsCollectionRef, {
      ...payment,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getPayments(sharedExpenseId: string): Promise<Payment[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const paymentsCollectionRef = await getPaymentsCollectionRef(
      getPaymentsCollectionPath(sharedExpenseId)
    );

    const querySnapshot = await getDocs(
      query(paymentsCollectionRef, orderBy("date", "desc"))
    );

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Payment)
    );
  },

  async getPaymentsBetweenUsers(
    user1Id: string,
    user2Id: string
  ): Promise<Payment[]> {
    const q = query(
      collection(db, "payments"),
      where("fromId", "in", [user1Id, user2Id]),
      where("toId", "in", [user1Id, user2Id])
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Payment)
    );
  },

  async deletePayment(
    id: string,
    currentSharedExpenseId: string
  ): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const docRef = doc(
      db,
      getPaymentsCollectionPath(currentSharedExpenseId),
      id
    );
    await deleteDoc(docRef);
  },
};

// --------------------------------------------------

// Shared Expenses Operation

const sharedExpensesCollectionPath = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/${SHARED_EXPENSES_COLLECTION_NAME}`;

async function getSharedExpensesCollectionRef() {
  return collection(db, sharedExpensesCollectionPath);
}

export const sharedExpenseService = {
  create: async (data: Omit<SharedExpense, "id">): Promise<string> => {
    const collectionRef = await getSharedExpensesCollectionRef();
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
  },

  getAll: async (): Promise<SharedExpense[]> => {
    const collectionRef = await getSharedExpensesCollectionRef();
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SharedExpense)
    );
  },

  update: async (
    id: string,
    updates: Partial<SharedExpense>
  ): Promise<void> => {
    await updateDoc(doc(db, sharedExpensesCollectionPath, id), updates);
  },
};

// --------------------------------------------------
