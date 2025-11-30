export interface User {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  payerId: string;
  amount: number;
  description: string;
  date: string;
}

export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
}

export interface Balance {
  userId: string;
  balance: number;
}

export interface Debt {
  fromId: string;
  toId: string;
  amount: number;
}
