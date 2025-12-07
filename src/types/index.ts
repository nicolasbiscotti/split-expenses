export interface Participant {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  sharedExpenseId: string;
  payerId: string;
  amount: number;
  description: string;
  date: string;
}

export interface Payment {
  id: string;
  sharedExpenseId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
}

export interface Balance {
  participantId: string;
  balance: number;
}

export interface Debt {
  fromId: string;
  toId: string;
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
  | "create-step-3";
export type StepValue = 1 | 2 | 3;

export type SharedExpenseType = "unique" | "recurring";
export type SharedExpenseStatus = "active" | "closed";

export interface SharedExpense {
  id: string;
  name: string;
  description: string;
  type: SharedExpenseType;
  status: SharedExpenseStatus;
  participantIds: string[];
  totalAmount: number;
  createdAt: string;
  closedAt?: string;
  periodName?: string; // Para recurrentes: "Enero 2025"
}

export interface Period {
  id: string;
  sharedExpenseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: SharedExpenseStatus;
}
