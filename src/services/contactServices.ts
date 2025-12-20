import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
} from "firebase/firestore";
import type { Contact } from "../types";
import {
  BASE_COLLECTION_PATH,
  CONTACTS_COLLECTION_NAME,
} from "./databaseService";
import { db } from "../firebase/config";

function getContactsPath(uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${CONTACTS_COLLECTION_NAME}`;
}
function getContactsRef(collectionPath: string) {
  return collection(db, collectionPath);
}

async function createContact(
  contact: Omit<Contact, "id">,
  createdById: string
): Promise<string> {
  const contactsPath = getContactsPath(createdById);
  const contactsRef = getContactsRef(contactsPath);

  const docRef = await addDoc(contactsRef, {
    ...contact,
    createdAt: Timestamp.now(),
    createdById,
  });

  return docRef.id;
}

async function createContactList(createdById: string): Promise<string[]> {
  const contactList = [
    { name: "Seba", email: "seba@example.com", appUserId: null },
    { name: "Nata", email: "nata@example.com", appUserId: null },
  ];

  const promises = contactList.map((contact: Omit<Contact, "id">) =>
    createContact(contact, createdById)
  );

  const docRefIds = await Promise.all(promises);

  return docRefIds;
}

async function getContacts(uid: string): Promise<Contact[]> {
  const contactsPath = getContactsPath(uid);
  const contactsRef = getContactsRef(contactsPath);
  const querySnapshot = await getDocs(query(contactsRef));

  return querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Contact)
  );
}

export const contactService = { createContact, createContactList, getContacts };
