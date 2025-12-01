import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

import type { Expense, Payment, Balance, Debt } from "../types";

// Expense Operations
export const expenseService = {
  // Create new expense
  async createExpense(expense: Omit<Expense, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "expenses"), {
      ...expense,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Get all expenses
  async getExpenses(): Promise<Expense[]> {
    const querySnapshot = await getDocs(
      query(collection(db, "expenses"), orderBy("date", "desc"))
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
    const docRef = doc(db, "expenses", id);
    await deleteDoc(docRef);
  },
};

// Payment Operations
export const paymentService = {
  async createPayment(payment: Omit<Payment, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "payments"), {
      ...payment,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getPayments(): Promise<Payment[]> {
    const querySnapshot = await getDocs(
      query(collection(db, "payments"), orderBy("date", "desc"))
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
};

// Balance Operations
export const balanceService = {
  async updateBalance(userId: string, balance: number): Promise<void> {
    const docRef = doc(db, "balances", userId);
    await updateDoc(docRef, { balance }, { merge: true });
  },

  async getBalance(userId: string): Promise<Balance | null> {
    const docRef = doc(db, "balances", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { userId: docSnap.id, ...docSnap.data() } as Balance;
    }
    return null;
  },

  async getAllBalances(): Promise<Balance[]> {
    const querySnapshot = await getDocs(collection(db, "balances"));
    return querySnapshot.docs.map(
      (doc) =>
        ({
          userId: doc.id,
          ...doc.data(),
        } as Balance)
    );
  },
};

// Debt Operations
export const debtService = {
  async updateDebt(debt: Debt): Promise<void> {
    const debtId = `${debt.fromId}_${debt.toId}`;
    const docRef = doc(db, "debts", debtId);

    if (debt.amount === 0) {
      // Delete if debt is settled
      await deleteDoc(docRef);
    } else {
      // Update or create debt
      await updateDoc(docRef, { ...debt }, { merge: true });
    }
  },

  async getDebtsForUser(userId: string): Promise<Debt[]> {
    const q = query(collection(db, "debts"), where("fromId", "==", userId));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Debt);
  },

  async getAllDebts(): Promise<Debt[]> {
    const querySnapshot = await getDocs(collection(db, "debts"));
    return querySnapshot.docs.map((doc) => doc.data() as Debt);
  },
};
