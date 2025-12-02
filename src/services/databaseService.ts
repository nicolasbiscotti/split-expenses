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

import type { Expense, Payment, Participant } from "../types";

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

// Expense Operations
const expensesCollectionPath = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/expenses`;

async function getExpensesCollectionRef() {
  return collection(db, expensesCollectionPath);
}

export const expenseService = {
  // Create new expense
  async createExpense(expense: Omit<Expense, "id">): Promise<string> {
    const collectionRef = await getExpensesCollectionRef();

    const docRef = await addDoc(collectionRef, {
      ...expense,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Get all expenses
  async getExpenses(): Promise<Expense[]> {
    const collectionRef = await getExpensesCollectionRef();

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

  // Get expenses by user
  async getExpensesByUser(userId: string): Promise<Expense[]> {
    const q = query(
      collection(db, "expenses"),
      where("payerId", "==", userId),
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
    const docRef = doc(db, "expenses", id);
    await updateDoc(docRef, updates);
  },

  // Delete expense
  async deleteExpense(id: string): Promise<void> {
    const docRef = doc(db, expensesCollectionPath, id);
    await deleteDoc(docRef);
  },
};

// Payment Operations
const paymentsCollectionPath = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/payments`;

async function getPaymentsCollectionRef() {
  return collection(db, paymentsCollectionPath);
}

export const paymentService = {
  async createPayment(payment: Omit<Payment, "id">): Promise<string> {
    const paymentsCollectionRef = await getPaymentsCollectionRef();

    const docRef = await addDoc(paymentsCollectionRef, {
      ...payment,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getPayments(): Promise<Payment[]> {
    const paymentsCollectionRef = await getPaymentsCollectionRef();

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

  async deletePayment(id: string): Promise<void> {
    const docRef = doc(db, paymentsCollectionPath, id);
    await deleteDoc(docRef);
  },
};
