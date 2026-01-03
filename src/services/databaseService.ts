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
  collectionGroup,
  or,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase/config";

import type {
  Expense,
  Payment,
  SharedExpense,
  User,
  GlobalContact,
} from "../types";
import { globalContactService } from "./globalContactService";

// Collection paths
const USERS_COLLECTION_NAME = "users";
const PENDING_INVITATIONS_COLLECTION_NAME = "pendingInvitations";

export const BASE_COLLECTION_PATH = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/${USERS_COLLECTION_NAME}`;

export const PENDING_INVITATIONS_PATH = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/${PENDING_INVITATIONS_COLLECTION_NAME}`;

const EXPENSES_COLLECTION_NAME = "expenses";
const PAYMENTS_COLLECTION_NAME = "payments";
export const SHARED_EXPENSES_COLLECTION_NAME = "sharedExpenses";

// ==================== EXPENSE OPERATIONS ====================

function getExpensesPath(sharedExpenseId: string, uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${EXPENSES_COLLECTION_NAME}`;
}

function getExpensesRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const expenseService = {
  async createExpense(
    expense: Omit<Expense, "id">,
    uid: string
  ): Promise<string> {
    const collectionPath = getExpensesPath(expense.sharedExpenseId, uid);
    const collectionRef = getExpensesRef(collectionPath);

    let docRef;

    await runTransaction(db, async () => {
      docRef = await addDoc(collectionRef, {
        ...expense,
        createdAt: Timestamp.now(),
      });

      const expenseList = await this.getExpenses(expense.sharedExpenseId, uid);

      let seTotalAmount = expenseList.reduce(
        (total, exp) => total + exp.amount,
        0
      );

      await sharedExpenseService.update(
        expense.sharedExpenseId,
        { totalAmount: seTotalAmount },
        uid
      );
    });

    console.log("Transaction successfully committed!");
    return docRef!.id;
  },

  async getExpenses(sharedExpenseId: string, uid: string): Promise<Expense[]> {
    if (sharedExpenseId === "") {
      return Promise.resolve([]);
    }

    const collectionPath = getExpensesPath(sharedExpenseId, uid);
    const collectionRef = getExpensesRef(collectionPath);

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

  async getExpensesByContact(
    contactId: string,
    sharedExpenseId: string,
    uid: string
  ): Promise<Expense[]> {
    const q = query(
      collection(db, getExpensesPath(sharedExpenseId, uid)),
      where("payerContactId", "==", contactId),
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

  async updateExpense(
    id: string,
    updates: Partial<Omit<Expense, "id">>,
    sharedExpenseId: string,
    uid: string
  ): Promise<void> {
    const docRef = doc(db, getExpensesPath(sharedExpenseId, uid), id);
    await updateDoc(docRef, updates);
  },

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
        { totalAmount: seTotalAmount },
        uid
      );
    });
  },
};

// ==================== PAYMENT OPERATIONS ====================

function getPaymentsPath(sharedExpenseId: string, uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${PAYMENTS_COLLECTION_NAME}`;
}

function getPaymentsRef(collectionPath: string) {
  return collection(db, collectionPath);
}

export const paymentService = {
  async createPayment(
    payment: Omit<Payment, "id">,
    uid: string
  ): Promise<string> {
    const paymentsCollectionRef = getPaymentsRef(
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

    const paymentsCollectionRef = getPaymentsRef(
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

  async getPaymentsBetweenContacts(
    contact1Id: string,
    contact2Id: string,
    sharedExpenseId: string,
    uid: string
  ): Promise<Payment[]> {
    const q = query(
      collection(db, getPaymentsPath(sharedExpenseId, uid)),
      where("fromContactId", "in", [contact1Id, contact2Id]),
      where("toContactId", "in", [contact1Id, contact2Id])
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

// ==================== SHARED EXPENSE OPERATIONS ====================

export function getSharedExpensesPath(uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}`;
}

function getSharedExpensesRef(collectionPath: string) {
  return collection(db, collectionPath);
}

/**
 * Input data for creating a shared expense
 */
export interface CreateSharedExpenseInput {
  name: string;
  description: string;
  type: "unique" | "recurring";
  participantContactIds: string[]; // Global Contact IDs
  adminContactIds: string[]; // Global Contact IDs (subset of participants)
}

export const sharedExpenseService = {
  /**
   * Create a new shared expense
   * No longer creates a participants subcollection - everything is in the document
   */
  create: async (
    data: CreateSharedExpenseInput,
    createdBy: User
  ): Promise<string> => {
    const uid = createdBy.uid;
    const collectionRef = getSharedExpensesRef(getSharedExpensesPath(uid));

    // Get the global contacts to find which ones have accounts
    const contacts = await globalContactService.getByIds(
      data.participantContactIds
    );
    const confirmedUserIds = contacts
      .filter((c) => c.appUserId !== null)
      .map((c) => c.appUserId as string);

    const sharedExpenseData: Omit<SharedExpense, "id"> = {
      name: data.name,
      description: data.description,
      type: data.type,
      status: "active",
      totalAmount: 0,
      createdAt: new Date().toISOString(),
      createdBy: uid,

      // Access control using Global Contact IDs
      adminContactIds: data.adminContactIds,
      participantContactIds: data.participantContactIds,

      // User IDs for Firestore rules (only those who have accounts)
      confirmedUserIds: confirmedUserIds,
    };

    const docRef = await addDoc(collectionRef, {
      ...sharedExpenseData,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  },

  /**
   * Get all shared expenses where user is a participant
   * Uses collection group query to search across all users
   */
  getAll: async (uid: string): Promise<SharedExpense[]> => {
    // First, get the user's global contact
    const userContact = await globalContactService.getByUserId(uid);

    if (!userContact) {
      // User doesn't have a contact yet, return empty
      return [];
    }

    // Query all shared expenses where this contact is a participant
    const expensesGroupRef = collectionGroup(
      db,
      SHARED_EXPENSES_COLLECTION_NAME
    );

    const q = query(
      expensesGroupRef,
      or(
        // User is in confirmedUserIds (has account and is confirmed)
        where("confirmedUserIds", "array-contains", uid),
        // Or user's contact is in participantContactIds
        where("participantContactIds", "array-contains", userContact.id)
      )
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SharedExpense)
    );
  },

  /**
   * Get shared expenses owned by a user
   */
  getOwned: async (uid: string): Promise<SharedExpense[]> => {
    const collectionRef = getSharedExpensesRef(getSharedExpensesPath(uid));
    const snapshot = await getDocs(collectionRef);

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SharedExpense)
    );
  },

  /**
   * Update a shared expense
   */
  update: async (
    id: string,
    updates: Partial<SharedExpense>,
    uid: string
  ): Promise<void> => {
    await updateDoc(doc(db, getSharedExpensesPath(uid), id), updates);
  },

  /**
   * Add a participant to a shared expense
   */
  addParticipant: async (
    sharedExpenseId: string,
    globalContactId: string,
    isAdmin: boolean,
    ownerUid: string
  ): Promise<void> => {
    const docRef = doc(db, getSharedExpensesPath(ownerUid), sharedExpenseId);

    const updateData: any = {
      participantContactIds: arrayUnion(globalContactId),
    };

    if (isAdmin) {
      updateData.adminContactIds = arrayUnion(globalContactId);
    }

    // Check if this contact has an account
    const contact = await globalContactService.getById(globalContactId);
    if (contact?.appUserId) {
      updateData.confirmedUserIds = arrayUnion(contact.appUserId);
    }

    await updateDoc(docRef, updateData);
  },

  /**
   * Remove a participant from a shared expense
   */
  removeParticipant: async (
    sharedExpenseId: string,
    globalContactId: string,
    ownerUid: string
  ): Promise<void> => {
    const contact = await globalContactService.getById(globalContactId);

    const docRef = doc(db, getSharedExpensesPath(ownerUid), sharedExpenseId);

    const updateData: any = {
      participantContactIds: arrayRemove(globalContactId),
      adminContactIds: arrayRemove(globalContactId),
    };

    if (contact?.appUserId) {
      updateData.confirmedUserIds = arrayRemove(contact.appUserId);
    }

    await updateDoc(docRef, updateData);
  },

  /**
   * Sync confirmedUserIds when a contact gets an account
   * Call this when a user creates an account to update all shared expenses they're in
   */
  syncConfirmedUser: async (
    globalContactId: string,
    userId: string
  ): Promise<void> => {
    // Find all shared expenses where this contact is a participant
    const expensesGroupRef = collectionGroup(
      db,
      SHARED_EXPENSES_COLLECTION_NAME
    );
    const q = query(
      expensesGroupRef,
      where("participantContactIds", "array-contains", globalContactId)
    );

    const querySnapshot = await getDocs(q);

    // Update each to add the userId to confirmedUserIds
    const updatePromises = querySnapshot.docs.map((docSnap) => {
      return updateDoc(docSnap.ref, {
        confirmedUserIds: arrayUnion(userId),
      });
    });

    await Promise.all(updatePromises);
  },
};
