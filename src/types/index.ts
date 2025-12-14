export * from "./auth";

export interface Participant {
  id: string;
  name: string;
  isAdmin: Boolean;
  contactId: string | null;
  appUserId?: string | null;
}

export interface Expense {
  id: string;
  sharedExpenseId: string;
  payerId: string; // User UID
  amount: number;
  description: string;
  date: string;

  // Auditoría
  createdBy: string; // User UID
  createdByAdmin: boolean; // Si fue creado por un admin
}

export interface Payment {
  id: string;
  sharedExpenseId: string;
  fromId: string; // User UID
  toId: string; // User UID
  amount: number;
  date: string;

  // Auditoría
  createdBy: string;
  createdByAdmin: boolean;
}

export interface Balance {
  participantId: string; // User UID
  balance: number;
}

export interface Debt {
  fromId: string; // User UID
  toId: string; // User UID
  amount: number;
}

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

  // Ownership y roles
  createdBy: string; // User UID del creador
  administrators: string[]; // Array de User UIDs
  participants: string[]; // Array de User UIDs (incluye admins)
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  appUserId: string | null;
}

export interface Period {
  id: string;
  sharedExpenseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: SharedExpenseStatus;
}

// View types
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
