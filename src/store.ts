import type { User, Expense, Payment } from "./types";

export default class AppStore {
  users: User[];
  expenses: Expense[];
  payments: Payment[];
  listeners: any;

  constructor() {
    this.users = [];
    this.expenses = [];
    this.payments = [];
    this.listeners = [];
    this.loadFromStorage();
  }

  getUsers() {
    return [...this.users];
  }
  getExpenses() {
    return [...this.expenses];
  }
  getPayments() {
    return [...this.payments];
  }

  addExpense(expense: Expense) {
    this.expenses.push(expense);
    this.saveToStorage();
    this.notify();
  }

  deleteExpense(id: string) {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.saveToStorage();
    this.notify();
  }

  addPayment(payment: Payment) {
    this.payments.push(payment);
    this.saveToStorage();
    this.notify();
  }

  deletePayment(id: string) {
    this.payments = this.payments.filter((p) => p.id !== id);
    this.saveToStorage();
    this.notify();
  }

  saveToStorage() {
    localStorage.setItem("splitexpenses_users", JSON.stringify(this.users));
    localStorage.setItem(
      "splitexpenses_expenses",
      JSON.stringify(this.expenses)
    );
    localStorage.setItem(
      "splitexpenses_payments",
      JSON.stringify(this.payments)
    );
  }

  loadFromStorage() {
    const usersData = localStorage.getItem("splitexpenses_users");
    const expensesData = localStorage.getItem("splitexpenses_expenses");
    const paymentsData = localStorage.getItem("splitexpenses_payments");

    if (usersData) {
      this.users = JSON.parse(usersData);
    }
    if (expensesData) {
      this.expenses = JSON.parse(expensesData);
    }
    if (paymentsData) {
      this.payments = JSON.parse(paymentsData);
    }

    if (this.users.length === 0) {
      this.users = [
        { id: "1", name: "Juan" },
        { id: "2", name: "Valeria" },
        { id: "3", name: "Juana" },
      ];
      this.saveToStorage();
    }
  }

  subscribe(listener: any) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l: any) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener: () => any) => listener());
  }
}
