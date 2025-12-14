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
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase/config";

import type { Expense, Participant, Payment, SharedExpense } from "../types";
import { participantService } from "./participantServices";

export const USERS_COLLECTION_NAME = "users";

export const BASE_COLLECTION_PATH = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/${USERS_COLLECTION_NAME}`;

const EXPENSES_COLLECTION_NAME = "expenses";
const PAYMENTS_COLLECTION_NAME = "payments";
export const PARTICIPANTS_COLLECTION_NAME = "participants";
export const SHARED_EXPENSES_COLLECTION_NAME = "sharedExpenses";
export const CONTACTS_COLLECTION_NAME = "contacts";

// Expense Operations

function getExpensesPath(sharedExpenseId: string, uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${EXPENSES_COLLECTION_NAME}`;
}

async function getExpensesRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const expenseService = {
  // Create new expense
  async createExpense(
    expense: Omit<Expense, "id">,
    uid: string
  ): Promise<string> {
    const collectionPath = getExpensesPath(expense.sharedExpenseId, uid);
    const collectionRef = await getExpensesRef(collectionPath);

    let docRef;

    await runTransaction(db, async () => {
      docRef = await addDoc(collectionRef, {
        ...expense,
        createdAt: Timestamp.now(),
      });

      const expenseList = await this.getExpenses(expense.sharedExpenseId, uid);

      let seTotalAmount = expenseList.reduce(
        (total, expense) => total + expense.amount,
        0
      );

      await sharedExpenseService.update(
        expense.sharedExpenseId,
        {
          totalAmount: seTotalAmount,
        },
        uid
      );
    });

    console.log("Transaction successfully committed! ==> ");
    return docRef!.id;
  },

  // Get all expenses
  async getExpenses(sharedExpenseId: string, uid: string): Promise<Expense[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const collectionPath = getExpensesPath(sharedExpenseId, uid);
    const collectionRef = await getExpensesRef(collectionPath);

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
  async getExpensesByUser(
    participantId: string,
    sharedExpenseId: string,
    uid: string
  ): Promise<Expense[]> {
    const q = query(
      collection(db, getExpensesPath(sharedExpenseId, uid)),
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
    updates: Partial<Omit<Expense, "id">>,
    sharedExpenseId: string,
    uid: string
  ): Promise<void> {
    const docRef = doc(db, getExpensesPath(sharedExpenseId, uid), id);
    await updateDoc(docRef, updates);
  },

  // Delete expense
  async deleteExpense(
    id: string,
    currentSharedExpenseId: string,
    uid: string
  ): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    if (uid === "") {
      return Promise.reject("No Current User Selected");
    }

    const docRef = doc(db, getExpensesPath(currentSharedExpenseId, uid), id);

    return await runTransaction(db, async () => {
      await deleteDoc(docRef);
      const expenseList = await this.getExpenses(currentSharedExpenseId, uid);

      let seTotalAmount = expenseList.reduce(
        (total, expense) => total + expense.amount,
        0
      );

      await sharedExpenseService.update(
        currentSharedExpenseId,
        {
          totalAmount: seTotalAmount,
        },
        uid
      );
    });
  },
};

// --------------------------------------------------

// Payment Operations

function getPaymentsPath(sharedExpenseId: string, uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${PAYMENTS_COLLECTION_NAME}`;
}

async function getPaymentsRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const paymentService = {
  async createPayment(
    payment: Omit<Payment, "id">,
    uid: string
  ): Promise<string> {
    const paymentsCollectionRef = await getPaymentsRef(
      getPaymentsPath(payment.sharedExpenseId, uid)
    );

    const docRef = await addDoc(paymentsCollectionRef, {
      ...payment,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  },

  async getPayments(sharedExpenseId: string, uid: string): Promise<Payment[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const paymentsCollectionRef = await getPaymentsRef(
      getPaymentsPath(sharedExpenseId, uid)
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
    user2Id: string,
    sharedExpenseId: string,
    uid: string
  ): Promise<Payment[]> {
    const q = query(
      collection(db, getPaymentsPath(sharedExpenseId, uid)),
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
    currentSharedExpenseId: string,
    uid: string
  ): Promise<void> {
    if (currentSharedExpenseId === "") {
      return Promise.reject("No Current Shared Expense Selected");
    }

    const docRef = doc(db, getPaymentsPath(currentSharedExpenseId, uid), id);
    await deleteDoc(docRef);
  },
};

// --------------------------------------------------

// Shared Expenses Operation

function getSharedExpensesPath(uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}`;
}

function getSharedExpensesRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const sharedExpenseService = {
  create: async (
    data: Omit<SharedExpense, "id">,
    participants: Omit<Participant, "id">[],
    uid: string
  ): Promise<string> => {
    const collectionRef = getSharedExpensesRef(getSharedExpensesPath(uid));

    let docRef;
    await runTransaction(db, async () => {
      docRef = await addDoc(collectionRef, data);

      await participantService.createParticipantList(
        docRef.id,
        participants,
        uid
      );
    });

    return docRef!.id;
  },

  getAll: async (uid: string): Promise<SharedExpense[]> => {
    const collectionRef = getSharedExpensesRef(getSharedExpensesPath(uid));
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SharedExpense)
    );
  },

  update: async (
    id: string,
    updates: Partial<SharedExpense>,
    uid: string
  ): Promise<void> => {
    await updateDoc(doc(db, getSharedExpensesPath(uid), id), updates);
  },
};

// --------------------------------------------------
