import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { ContactAlias, GlobalContact, ResolvedContact } from "../types";
import { globalContactService } from "./globalContactService";

// Base path for users
const BASE_PATH = `environments/${
  import.meta.env.VITE_FIRESTORE_DATA_ID
}/users`;

// Collection name for contact aliases
const CONTACT_ALIASES_COLLECTION = "contactAliases";

/**
 * Get the path to a user's contact aliases collection
 */
function getContactAliasesPath(userId: string): string {
  return `${BASE_PATH}/${userId}/${CONTACT_ALIASES_COLLECTION}`;
}

export const contactAliasService = {
  /**
   * Create or update an alias for a global contact
   * This is how users give "nicknames" to contacts they know
   */
  async setAlias(
    userId: string,
    globalContactId: string,
    displayName: string
  ): Promise<ContactAlias> {
    const aliasPath = getContactAliasesPath(userId);
    const docRef = doc(db, aliasPath, globalContactId);

    const alias: ContactAlias = {
      globalContactId,
      displayName: displayName.trim(),
      addedAt: new Date().toISOString(),
    };

    await setDoc(docRef, {
      ...alias,
      addedAt: Timestamp.now(),
    });

    return alias;
  },

  /**
   * Get a user's alias for a specific contact
   */
  async getAlias(
    userId: string,
    globalContactId: string
  ): Promise<ContactAlias | null> {
    const aliasPath = getContactAliasesPath(userId);
    const docRef = doc(db, aliasPath, globalContactId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      globalContactId: snapshot.id,
      ...snapshot.data(),
    } as ContactAlias;
  },

  /**
   * Get all aliases for a user
   */
  async getAllAliases(userId: string): Promise<ContactAlias[]> {
    const aliasPath = getContactAliasesPath(userId);
    const aliasesRef = collection(db, aliasPath);
    const snapshot = await getDocs(query(aliasesRef));

    return snapshot.docs.map((docSnap) => ({
      globalContactId: docSnap.id,
      ...docSnap.data(),
    })) as ContactAlias[];
  },

  /**
   * Delete an alias
   */
  async deleteAlias(userId: string, globalContactId: string): Promise<void> {
    const aliasPath = getContactAliasesPath(userId);
    const docRef = doc(db, aliasPath, globalContactId);
    await deleteDoc(docRef);
  },

  /**
   * Get aliases for specific contact IDs
   */
  async getAliasesForContacts(
    userId: string,
    globalContactIds: string[]
  ): Promise<Map<string, ContactAlias>> {
    const aliasMap = new Map<string, ContactAlias>();
    
    if (globalContactIds.length === 0) return aliasMap;

    const aliases = await this.getAllAliases(userId);
    
    aliases.forEach((alias) => {
      if (globalContactIds.includes(alias.globalContactId)) {
        aliasMap.set(alias.globalContactId, alias);
      }
    });

    return aliasMap;
  },

  /**
   * Resolve contacts with aliases for display
   * This combines GlobalContacts with user's aliases to create display-ready data
   */
  async resolveContacts(
    userId: string,
    globalContacts: GlobalContact[]
  ): Promise<ResolvedContact[]> {
    if (globalContacts.length === 0) return [];

    const contactIds = globalContacts.map((c) => c.id);
    const aliasMap = await this.getAliasesForContacts(userId, contactIds);

    return globalContacts.map((contact) => {
      const alias = aliasMap.get(contact.id);
      return {
        id: contact.id,
        email: contact.email,
        displayName: alias?.displayName || contact.email,
        appUserId: contact.appUserId,
        hasAccount: contact.appUserId !== null,
      };
    });
  },

  /**
   * Resolve a single contact with alias
   */
  async resolveContact(
    userId: string,
    globalContact: GlobalContact
  ): Promise<ResolvedContact> {
    const alias = await this.getAlias(userId, globalContact.id);

    return {
      id: globalContact.id,
      email: globalContact.email,
      displayName: alias?.displayName || globalContact.email,
      appUserId: globalContact.appUserId,
      hasAccount: globalContact.appUserId !== null,
    };
  },

  /**
   * Create a contact and set alias in one operation
   * This is the main method for adding a new contact from the UI
   */
  async createContactWithAlias(
    userId: string,
    email: string,
    displayName: string
  ): Promise<ResolvedContact> {
    // Create or get global contact
    const globalContact = await globalContactService.getOrCreateByEmail(
      email,
      userId
    );

    // Set the user's alias for this contact
    await this.setAlias(userId, globalContact.id, displayName);

    return {
      id: globalContact.id,
      email: globalContact.email,
      displayName: displayName.trim(),
      appUserId: globalContact.appUserId,
      hasAccount: globalContact.appUserId !== null,
    };
  },

  /**
   * Get all contacts for a user (their aliases resolved with global data)
   * This is the main method for loading a user's "contact list"
   */
  async getUserContacts(userId: string): Promise<ResolvedContact[]> {
    // Get all aliases for this user
    const aliases = await this.getAllAliases(userId);
    
    if (aliases.length === 0) return [];

    // Get the corresponding global contacts
    const contactIds = aliases.map((a) => a.globalContactId);
    const globalContacts = await globalContactService.getByIds(contactIds);

    // Create a map for quick lookup
    const contactMap = new Map<string, GlobalContact>();
    globalContacts.forEach((c) => contactMap.set(c.id, c));

    // Resolve with aliases
    return aliases
      .filter((alias) => contactMap.has(alias.globalContactId))
      .map((alias) => {
        const contact = contactMap.get(alias.globalContactId)!;
        return {
          id: contact.id,
          email: contact.email,
          displayName: alias.displayName,
          appUserId: contact.appUserId,
          hasAccount: contact.appUserId !== null,
        };
      });
  },
};
