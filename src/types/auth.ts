/**
 * User from Firebase Auth + Firestore
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

/**
 * Roles en un shared expense
 */
export type UserRole = "administrator" | "participant";

/**
 * Invitación pendiente
 */
export interface PendingInvitation {
  id: string;
  email: string;
  pendingContactId: string;
  sharedExpenseId: string;
  sharedExpenseName: string;
  invitedBy: string;
  invitedByName: string;
  invitedAt: string;
  role: UserRole;
  status: "pending" | "accepted" | "rejected";
}

/**
 * Link de invitación
 */
export interface InvitationLink {
  id: string;
  token: string;
  sharedExpenseId: string;
  sharedExpenseName: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses?: number;
  usedCount: number;
  usedBy: string[];
  role: UserRole;
  active: boolean;
}

/**
 * Permisos calculados para un usuario en un shared expense
 */
export interface UserPermissions {
  isAdmin: boolean;
  isParticipant: boolean;
  canCreateExpense: boolean;
  canCreateExpenseForOthers: boolean;
  canDeleteOwnExpense: boolean;
  canDeleteAnyExpense: boolean;
  canCreatePayment: boolean;
  canCreatePaymentForOthers: boolean;
  canDeleteOwnPayment: boolean;
  canDeleteAnyPayment: boolean;
  canAddParticipants: boolean;
  canCloseSharedExpense: boolean;
  canViewSharedExpense: boolean;
}

/**
 * Resultado de validación para cerrar
 */
export interface CloseValidation {
  canClose: boolean;
  reasons: string[];
}
