import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalContact } from "../types";

// Global contacts collection path
const GLOBAL_CONTACTS_PATH = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/globalContacts`;

/**
 * Normalize email for consistent storage and lookup
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Helper: Split array into chunks for Firestore queries
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export const globalContactService = {
  /**
   * Get or create a global contact by email
   * Returns existing contact if email already exists, otherwise creates new one
   * This is the main method to use when adding contacts
   */
  async getOrCreateByEmail(
    email: string,
    createdByUid: string
  ): Promise<GlobalContact> {
    const normalizedEmail = normalizeEmail(email);

    // Check if contact already exists
    const existing = await this.getByEmail(normalizedEmail);
    if (existing) {
      return existing;
    }

    // Create new global contact
    const contactsRef = collection(db, GLOBAL_CONTACTS_PATH);
    const newDocRef = doc(contactsRef);

    const newContact: Omit<GlobalContact, "id"> = {
      email: normalizedEmail,
      appUserId: null,
      createdAt: new Date().toISOString(),
      createdBy: createdByUid,
    };

    await setDoc(newDocRef, {
      ...newContact,
      createdAt: Timestamp.now(),
    });

    return {
      id: newDocRef.id,
      ...newContact,
    };
  },

  /**
   * Get global contact by email
   */
  async getByEmail(email: string): Promise<GlobalContact | null> {
    const normalizedEmail = normalizeEmail(email);
    const contactsRef = collection(db, GLOBAL_CONTACTS_PATH);
    const q = query(contactsRef, where("email", "==", normalizedEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as GlobalContact;
  },

  /**
   * Get global contact by ID
   */
  async getById(contactId: string): Promise<GlobalContact | null> {
    const docRef = doc(db, GLOBAL_CONTACTS_PATH, contactId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as GlobalContact;
  },

  /**
   * Get multiple global contacts by IDs
   */
  async getByIds(contactIds: string[]): Promise<GlobalContact[]> {
    if (contactIds.length === 0) return [];

    const contacts: GlobalContact[] = [];

    // Firestore 'in' query limit is 30, batch if needed
    const chunks = chunkArray(contactIds, 30);

    for (const chunk of chunks) {
      const contactsRef = collection(db, GLOBAL_CONTACTS_PATH);
      const q = query(contactsRef, where("__name__", "in", chunk));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((docSnap) => {
        contacts.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as GlobalContact);
      });
    }

    return contacts;
  },

  /**
   * Link a global contact to a user account
   * Called when a user creates an account - finds their contact by email and links it
   */
  async linkToUser(email: string, userId: string): Promise<GlobalContact | null> {
    const contact = await this.getByEmail(email);

    if (contact && !contact.appUserId) {
      const docRef = doc(db, GLOBAL_CONTACTS_PATH, contact.id);
      await updateDoc(docRef, { appUserId: userId });
      
      return {
        ...contact,
        appUserId: userId,
      };
    }

    return contact;
  },

  /**
   * Get global contact by userId
   * Use this to find a user's own contact record
   */
  async getByUserId(userId: string): Promise<GlobalContact | null> {
    const contactsRef = collection(db, GLOBAL_CONTACTS_PATH);
    const q = query(contactsRef, where("appUserId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as GlobalContact;
  },

  /**
   * Create a global contact for a new user (self-registration)
   * This creates both the contact and links it to the user
   */
  async createForUser(
    email: string,
    userId: string
  ): Promise<GlobalContact> {
    const normalizedEmail = normalizeEmail(email);

    // Check if already exists
    const existing = await this.getByEmail(normalizedEmail);
    if (existing) {
      // If exists but not linked, link it
      if (!existing.appUserId) {
        return (await this.linkToUser(normalizedEmail, userId))!;
      }
      return existing;
    }

    // Create new contact already linked to user
    const contactsRef = collection(db, GLOBAL_CONTACTS_PATH);
    const newDocRef = doc(contactsRef);

    const newContact: Omit<GlobalContact, "id"> = {
      email: normalizedEmail,
      appUserId: userId,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await setDoc(newDocRef, {
      ...newContact,
      createdAt: Timestamp.now(),
    });

    return {
      id: newDocRef.id,
      ...newContact,
    };
  },

  /**
   * Check if an email already has an account
   */
  async hasAccount(email: string): Promise<boolean> {
    const contact = await this.getByEmail(email);
    return contact?.appUserId !== null && contact?.appUserId !== undefined;
  },

  /**
   * Get all contacts that have accounts (for Firestore rules sync)
   */
  async getContactsWithAccounts(contactIds: string[]): Promise<GlobalContact[]> {
    const contacts = await this.getByIds(contactIds);
    return contacts.filter((c) => c.appUserId !== null);
  },
};
