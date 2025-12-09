import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { app } from "../firebase/config";
import type { User } from "../types/auth";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configurar el provider
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Sign in con Google
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Convertir FirebaseUser a nuestro User
    const user: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || firebaseUser.email!,
      photoURL: firebaseUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    return user;
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Obtener el usuario actual
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Observar cambios en el estado de autenticación
 */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Convertir FirebaseUser a User
 */
export function firebaseUserToUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: firebaseUser.displayName || firebaseUser.email!,
    photoURL: firebaseUser.photoURL || undefined,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

/**
 * Mensajes de error amigables
 */
function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    "auth/popup-closed-by-user": "Inicio de sesión cancelado",
    "auth/cancelled-popup-request": "Inicio de sesión cancelado",
    "auth/popup-blocked": "El popup fue bloqueado por el navegador",
    "auth/account-exists-with-different-credential":
      "Ya existe una cuenta con este email",
    "auth/network-request-failed": "Error de conexión. Verifica tu internet",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
    "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
  };

  return (
    errorMessages[errorCode] || "Error al iniciar sesión. Intenta de nuevo"
  );
}
