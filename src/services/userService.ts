import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/config";

import type { User } from "../types/auth";
import { BASE_COLLECTION_PATH as USER_COLLECTION } from "./databaseService";

export async function createOrUpdateUser(user: User): Promise<void> {
  try {
    const userRef = doc(db, USER_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        lastLoginAt: new Date().toISOString(),
        displayName: user.displayName,
        photoURL: user.photoURL || null,
      });
    } else {
      await setDoc(userRef, {
        ...user,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw error;
  }
}

/**
 * Obtener usuario por UID
 */
export async function getUserById(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, USER_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }

    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const usersRef = collection(db, USER_COLLECTION);
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    }

    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

/**
 * Obtener múltiples usuarios por UIDs
 */
export async function getUsersByIds(uids: string[]): Promise<User[]> {
  try {
    if (uids.length === 0) return [];

    const users: User[] = [];

    // Firestore tiene límite de 10 en 'in' queries, así que hacemos en lotes
    const chunks = chunkArray(uids, 10);

    for (const chunk of chunks) {
      const usersRef = collection(db, USER_COLLECTION);
      const q = query(usersRef, where("uid", "in", chunk));
      const querySnapshot = await getDocs(q);

      querySnapshot.docs.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
    }

    return users;
  } catch (error) {
    console.error("Error getting users by ids:", error);
    throw error;
  }
}

/**
 * Buscar usuarios por email (para autocompletado)
 */
export async function searchUsersByEmail(emailPrefix: string): Promise<User[]> {
  try {
    const usersRef = collection(db, USER_COLLECTION);
    const q = query(
      usersRef,
      where("email", ">=", emailPrefix),
      where("email", "<=", emailPrefix + "\uf8ff")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as User)
    );
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
}

/**
 * Helper: Dividir array en chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
