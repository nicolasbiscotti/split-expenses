export * from "./auth";

// ==================== GLOBAL CONTACT ====================
// Stored in: environments/{env}/globalContacts/{contactId}
// This is a GLOBAL collection - contacts are shared across all users
export interface GlobalContact {
  id: string;
  email: string; // Normalized (lowercase, trimmed) - UNIQUE
  appUserId: string | null; // null until user creates account
  createdAt: string;
  createdBy: string; // UID of user who first created this contact
}

// ==================== CONTACT ALIAS ====================
// Stored in: environments/{env}/users/{uid}/contactAliases/{globalContactId}
// Each user has their own "nickname" for contacts they know
export interface ContactAlias {
  globalContactId: string; // Reference to GlobalContact
  displayName: string; // User's personal name for this contact
  addedAt: string;
}

// ==================== RESOLVED CONTACT ====================
// Combined view for UI (GlobalContact + user's alias)
// This is NOT stored in Firestore - it's computed at runtime
export interface ResolvedContact {
  id: string; // Global Contact ID
  email: string;
  displayName: string; // From user's alias, or email if no alias
  appUserId: string | null;
  hasAccount: boolean; // Convenience flag: appUserId !== null
}

// ==================== EXPENSE (UPDATED) ====================
export interface Expense {
  id: string;
  sharedExpenseId: string;
  payerContactId: string; // Global Contact ID (was payerId)
  amount: number;
  description: string;
  date: string;

  // Audit
  createdBy: string; // User UID who registered this
  createdByAdmin: boolean;
}

// ==================== PAYMENT (UPDATED) ====================
export interface Payment {
  id: string;
  sharedExpenseId: string;
  fromContactId: string; // Global Contact ID (was fromId)
  toContactId: string; // Global Contact ID (was toId)
  amount: number;
  date: string;

  // Audit
  createdBy: string;
  createdByAdmin: boolean;
}

// ==================== BALANCE (UPDATED) ====================
export interface Balance {
  participantContactId: string; // Global Contact ID (was participantId)
  balance: number;
}

// ==================== DEBT (UPDATED) ====================
export interface Debt {
  fromContactId: string; // Global Contact ID (was fromId)
  toContactId: string; // Global Contact ID (was toId)
  amount: number;
}

// ==================== SHARED EXPENSE (UPDATED) ====================
export type SharedExpenseType = "unique" | "recurring";
export type SharedExpenseStatus = "active" | "closed";

export interface SharedExpense {
  id: string;
  name: string;
  description: string;
  type: SharedExpenseType;
  status: SharedExpenseStatus;
  totalAmount: number;
  createdAt: string;
  closedAt?: string;
  periodName?: string;

  // Ownership
  createdBy: string; // User UID of creator

  // Access Control - ALL using Global Contact IDs
  adminContactIds: string[]; // Global Contact IDs with admin role
  participantContactIds: string[]; // All participants (includes admins)

  // For Firestore rules - User IDs who have confirmed accounts
  // This is populated when a contact's appUserId becomes available
  confirmedUserIds: string[]; // User UIDs who have accounts and confirmed
}

// ==================== PERIOD ====================
export interface Period {
  id: string;
  sharedExpenseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: SharedExpenseStatus;
}

// ==================== VIEW TYPES ====================
export type ViewType =
  | "login"
  | "shared-expense-list"
  | "create-step-1"
  | "create-step-2"
  | "create-step-3"
  | "dashboard"
  | "add-expense"
  | "add-payment"
  | "history"
  | "manage-participants"
  | "user-profile";

export type StepValue = 1 | 2 | 3;

// ==================== DEPRECATED - TO BE REMOVED ====================
// Keep temporarily for backward compatibility during migration
/** @deprecated Use GlobalContact + ContactAlias instead */
export interface Contact {
  id: string;
  name: string;
  email: string;
  appUserId: string | null;
}

/** @deprecated Participants are now derived from GlobalContacts */
export interface Participant {
  id: string;
  name: string;
  isAdmin: Boolean;
  contactId: string | null;
  email?: string;
  appUserId?: string | null;
}
