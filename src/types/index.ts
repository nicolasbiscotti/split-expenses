export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export interface Contact {
  uid: string;
  email: string;
  displayName: string;
}

export interface SharedExpenseParticipant {
  email: string;
  displayName: string;
  uid?: string;
}

export interface Expense {
  id: string;
  sharedExpenseId: string;
  creatorUid: string;
  paidByEmail: string;
  amount: number;
  description: string;
  date: string;
}

export interface Payment {
  id: string;
  sharedExpenseId: string;
  creatorUid: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  date: string;
}

export interface Balance {
  email: string;
  balance: number;
}

export interface Debt {
  fromEmail: string;
  toEmail: string;
  amount: number;
}

export type ViewType =
  | "dashboard"
  | "add-expense"
  | "add-payment"
  | "history"
  | "shared-expense-list"
  | "create-step-1"
  | "create-step-2"
  | "create-step-3"
  | "profile";

export type StepValue = 1 | 2 | 3;

export type SharedExpenseType = "unique" | "recurring";
export type SharedExpenseStatus = "active" | "closed";

export interface SharedExpense {
  id: string;
  name: string;
  description: string;
  type: SharedExpenseType;
  status: SharedExpenseStatus;
  creatorUid: string;
  participants: SharedExpenseParticipant[];
  participantUids: string[];
  participantEmails: string[];
  totalAmount: number;
  expensesCount?: number;
  netPaid?: Record<string, number>;
  createdAt: string;
  closedAt?: string;
  periodName?: string; // For recurring: "Enero 2025"
}

export interface Period {
  id: string;
  sharedExpenseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: SharedExpenseStatus;
}
