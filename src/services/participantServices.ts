import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
} from "firebase/firestore";
import type { Participant } from "../types";
import {
  BASE_COLLECTION_PATH,
  SHARED_EXPENSES_COLLECTION_NAME,
  PARTICIPANTS_COLLECTION_NAME,
} from "./databaseService";
import { db } from "../firebase/config";

function getParticipantsPath(sharedExpenseId: string, uid: string) {
  return `${BASE_COLLECTION_PATH}/${uid}/${SHARED_EXPENSES_COLLECTION_NAME}/${sharedExpenseId}/${PARTICIPANTS_COLLECTION_NAME}`;
}
function getParticipantsRef(collectionPath: string) {
  return collection(db, collectionPath);
}

async function createParticipant(
  participant: Omit<Participant, "id">,
  sharedExpenseId: string,
  uid: string
): Promise<string> {
  const contactsPath = getParticipantsPath(sharedExpenseId, uid);
  const contactsRef = getParticipantsRef(contactsPath);

  const docRef = await addDoc(contactsRef, {
    ...participant,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

async function createParticipantList(
  sharedExpenseId: string,
  participantList: Omit<Participant, "id">[],
  uid: string
): Promise<string[]> {
  const contactsPath = getParticipantsPath(sharedExpenseId, uid);
  const contactsRef = getParticipantsRef(contactsPath);

  const promises = participantList.map((participant: Omit<Participant, "id">) =>
    addDoc(contactsRef, {
      ...participant,
      createdAt: Timestamp.now(),
    })
  );

  const docRef = await Promise.all(promises);

  return docRef.map((ref) => ref.id);
}

async function getParticipants(
  sharedExpenseId: string,
  uid: string
): Promise<Participant[]> {
  const contactsPath = getParticipantsPath(sharedExpenseId, uid);
  const contactsRef = getParticipantsRef(contactsPath);
  const querySnapshot = await getDocs(query(contactsRef));

  return querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Participant)
  );
}

export const participantService = {
  createParticipant,
  createParticipantList,
  getParticipants,
};
