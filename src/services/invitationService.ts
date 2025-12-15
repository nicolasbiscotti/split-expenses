import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type {
  PendingInvitation,
  InvitationLink,
  UserRole,
} from "../types/auth";
import { userService } from "./userService";

import {
  getSharedExpensesPath,
  PENDING_INVITATIONS_PATH,
} from "./databaseService";

/**
 * INVITACIONES POR EMAIL
 */

/**
 * Invitar usuario por email
 * Si el usuario existe → agregar directamente al shared expense
 * Si NO existe → crear invitación pendiente
 */
export async function inviteUserByEmail(
  email: string,
  sharedExpenseId: string,
  sharedExpenseName: string,
  invitedBy: string,
  invitedByName: string,
  role: UserRole = "participant"
): Promise<{ success: boolean; userExists: boolean; message: string }> {
  try {
    // 1. Verificar si el usuario existe
    const existingUser = await userService.getUserByEmail(email);

    if (existingUser) {
      // Usuario existe → agregarlo directamente al shared expense
      const sharedExpenseRef = doc(
        db,
        getSharedExpensesPath(invitedBy),
        sharedExpenseId
      );

      const updateData: any = {
        participants: arrayUnion(existingUser.uid),
      };

      if (role === "administrator") {
        updateData.administrators = arrayUnion(existingUser.uid);
      }

      await updateDoc(sharedExpenseRef, updateData);

      return {
        success: true,
        userExists: true,
        message: `${existingUser.displayName} fue agregado al gasto compartido`,
      };
    } else {
      // Usuario NO existe → crear invitación pendiente
      const invitation: Omit<PendingInvitation, "id"> = {
        email,
        sharedExpenseId,
        sharedExpenseName,
        invitedBy,
        invitedByName,
        invitedAt: new Date().toISOString(),
        role,
        status: "pending",
      };

      await addDoc(collection(db, PENDING_INVITATIONS_PATH), invitation);

      // TODO: Enviar email de invitación

      return {
        success: true,
        userExists: false,
        message: `Se envió una invitación a ${email}`,
      };
    }
  } catch (error) {
    console.error("Error inviting user by email:", error);
    throw error;
  }
}

/**
 * Obtener invitaciones pendientes para un email
 */
export async function getPendingInvitationsByEmail(
  email: string
): Promise<PendingInvitation[]> {
  try {
    const invitationsRef = collection(db, PENDING_INVITATIONS_PATH);
    const q = query(
      invitationsRef,
      where("email", "==", email),
      where("status", "==", "pending")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as PendingInvitation)
    );
  } catch (error) {
    console.error("Error getting pending invitations:", error);
    throw error;
  }
}

/**
 * Aceptar invitación pendiente
 */
export async function acceptPendingInvitation(
  invitationId: string,
  userId: string
): Promise<void> {
  try {
    const invitationRef = doc(db, PENDING_INVITATIONS_PATH, invitationId);
    const invitationSnap = await getDoc(invitationRef);

    if (!invitationSnap.exists()) {
      throw new Error("Invitación no encontrada");
    }

    const invitation = invitationSnap.data() as PendingInvitation;

    // Agregar usuario al shared expense
    const sharedExpenseRef = doc(
      db,
      getSharedExpensesPath(invitation.invitedBy),
      invitation.sharedExpenseId
    );

    const updateData: any = {
      participants: arrayUnion(userId),
    };

    if (invitation.role === "administrator") {
      updateData.administrators = arrayUnion(userId);
    }

    await updateDoc(sharedExpenseRef, updateData);

    // Marcar invitación como aceptada
    await updateDoc(invitationRef, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw error;
  }
}

/**
 * Rechazar invitación pendiente
 */
export async function rejectPendingInvitation(
  invitationId: string
): Promise<void> {
  try {
    const invitationRef = doc(db, PENDING_INVITATIONS_PATH, invitationId);

    await updateDoc(invitationRef, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    throw error;
  }
}

/**
 * INVITACIONES POR LINK
 */

/**
 * Generar link de invitación
 */
export async function generateInvitationLink(
  sharedExpenseId: string,
  sharedExpenseName: string,
  createdBy: string,
  role: UserRole = "participant",
  expiresInDays: number = 7,
  maxUses?: number
): Promise<InvitationLink> {
  try {
    const token = generateUniqueToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitationLink: Omit<InvitationLink, "id"> = {
      token,
      sharedExpenseId,
      sharedExpenseName,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses,
      usedCount: 0,
      usedBy: [],
      role,
      active: true,
    };

    const docRef = await addDoc(
      collection(db, "invitationLinks"),
      invitationLink
    );

    return {
      id: docRef.id,
      ...invitationLink,
    };
  } catch (error) {
    console.error("Error generating invitation link:", error);
    throw error;
  }
}

/**
 * Obtener link de invitación por token
 */
export async function getInvitationLinkByToken(
  token: string
): Promise<InvitationLink | null> {
  try {
    const linksRef = collection(db, "invitationLinks");
    const q = query(linksRef, where("token", "==", token));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as InvitationLink;
  } catch (error) {
    console.error("Error getting invitation link:", error);
    throw error;
  }
}

/**
 * Usar link de invitación
 */
export async function useInvitationLink(
  linkId: string,
  userId: string
): Promise<{ success: boolean; message: string; sharedExpenseId?: string }> {
  try {
    const linkRef = doc(db, "invitationLinks", linkId);
    const linkSnap = await getDoc(linkRef);

    if (!linkSnap.exists()) {
      return { success: false, message: "Link de invitación no encontrado" };
    }

    const link = linkSnap.data() as InvitationLink;

    // Validaciones
    if (!link.active) {
      return { success: false, message: "Este link ha sido desactivado" };
    }

    if (new Date(link.expiresAt) < new Date()) {
      return { success: false, message: "Este link ha expirado" };
    }

    if (link.maxUses && link.usedCount >= link.maxUses) {
      return {
        success: false,
        message: "Este link ha alcanzado el límite de usos",
      };
    }

    if (link.usedBy.includes(userId)) {
      return {
        success: false,
        message: "Ya usaste este link",
        sharedExpenseId: link.sharedExpenseId,
      };
    }

    // Agregar usuario al shared expense
    const sharedExpenseRef = doc(
      db,
      getSharedExpensesPath(link.createdBy),
      link.sharedExpenseId
    );

    const updateData: any = {
      participants: arrayUnion(userId),
    };

    if (link.role === "administrator") {
      updateData.administrators = arrayUnion(userId);
    }

    await updateDoc(sharedExpenseRef, updateData);

    // Actualizar link
    await updateDoc(linkRef, {
      usedCount: link.usedCount + 1,
      usedBy: arrayUnion(userId),
    });

    return {
      success: true,
      message: "Te uniste exitosamente al gasto compartido",
      sharedExpenseId: link.sharedExpenseId,
    };
  } catch (error) {
    console.error("Error using invitation link:", error);
    throw error;
  }
}

/**
 * Desactivar link de invitación
 */
export async function deactivateInvitationLink(linkId: string): Promise<void> {
  try {
    const linkRef = doc(db, "invitationLinks", linkId);
    await updateDoc(linkRef, { active: false });
  } catch (error) {
    console.error("Error deactivating invitation link:", error);
    throw error;
  }
}

/**
 * Obtener links activos de un shared expense
 */
export async function getActiveInvitationLinks(
  sharedExpenseId: string
): Promise<InvitationLink[]> {
  try {
    const linksRef = collection(db, "invitationLinks");
    const q = query(
      linksRef,
      where("sharedExpenseId", "==", sharedExpenseId),
      where("active", "==", true)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as InvitationLink)
    );
  } catch (error) {
    console.error("Error getting active invitation links:", error);
    throw error;
  }
}

/**
 * Helper: Generar token único
 */
function generateUniqueToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
