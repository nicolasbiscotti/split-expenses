// src/store/AppStore.ts

import { Participant, Expense, Payment, SharedExpense } from "./types";

type Listener = () => void;

export class AppStore {
  private users: Participant[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private listeners: Listener[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Usuarios
  getUsers(): Participant[] {
    return [...this.users];
  }

  addUser(user: Participant): void {
    this.users.push(user);
    this.saveToStorage();
    this.notify();
  }

  getUsersByIds(ids: string[]): Participant[] {
    return this.users.filter((u) => ids.includes(u.id));
  }

  // Gastos Compartidos
  getSharedExpenses(): SharedExpense[] {
    return [...this.sharedExpenses];
  }

  getSharedExpense(id: string): SharedExpense | undefined {
    return this.sharedExpenses.find((se) => se.id === id);
  }

  addSharedExpense(sharedExpense: SharedExpense): void {
    this.sharedExpenses.push(sharedExpense);
    this.saveToStorage();
    this.notify();
  }

  updateSharedExpense(id: string, updates: Partial<SharedExpense>): void {
    const index = this.sharedExpenses.findIndex((se) => se.id === id);
    if (index !== -1) {
      this.sharedExpenses[index] = {
        ...this.sharedExpenses[index],
        ...updates,
      };
      this.saveToStorage();
      this.notify();
    }
  }

  closeSharedExpense(id: string): void {
    this.updateSharedExpense(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
    });
  }

  getCurrentSharedExpenseId(): string | null {
    return this.currentSharedExpenseId;
  }

  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;
    this.notify();
  }

  // Gastos
  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  getExpensesBySharedExpense(sharedExpenseId: string): Expense[] {
    return this.expenses.filter((e) => e.sharedExpenseId === sharedExpenseId);
  }

  addExpense(expense: Expense): void {
    this.expenses.push(expense);
    this.saveToStorage();
    this.notify();
  }

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.saveToStorage();
    this.notify();
  }

  // Pagos
  getPayments(): Payment[] {
    return [...this.payments];
  }

  getPaymentsBySharedExpense(sharedExpenseId: string): Payment[] {
    return this.payments.filter((p) => p.sharedExpenseId === sharedExpenseId);
  }

  addPayment(payment: Payment): void {
    this.payments.push(payment);
    this.saveToStorage();
    this.notify();
  }

  deletePayment(id: string): void {
    this.payments = this.payments.filter((p) => p.id !== id);
    this.saveToStorage();
    this.notify();
  }

  // Persistencia
  private saveToStorage(): void {
    localStorage.setItem("splitexpenses_users", JSON.stringify(this.users));
    localStorage.setItem(
      "splitexpenses_expenses",
      JSON.stringify(this.expenses)
    );
    localStorage.setItem(
      "splitexpenses_payments",
      JSON.stringify(this.payments)
    );
    localStorage.setItem(
      "splitexpenses_shared",
      JSON.stringify(this.sharedExpenses)
    );
    localStorage.setItem(
      "splitexpenses_current",
      this.currentSharedExpenseId || ""
    );
  }

  private loadFromStorage(): void {
    const usersData = localStorage.getItem("splitexpenses_users");
    const expensesData = localStorage.getItem("splitexpenses_expenses");
    const paymentsData = localStorage.getItem("splitexpenses_payments");
    const sharedData = localStorage.getItem("splitexpenses_shared");
    const currentData = localStorage.getItem("splitexpenses_current");

    if (usersData) this.users = JSON.parse(usersData);
    if (expensesData) this.expenses = JSON.parse(expensesData);
    if (paymentsData) this.payments = JSON.parse(paymentsData);
    if (sharedData) this.sharedExpenses = JSON.parse(sharedData);
    if (currentData) this.currentSharedExpenseId = currentData || null;

    // Usuarios por defecto si no hay ninguno
    if (this.users.length === 0) {
      this.users = [
        { id: "1", name: "Juan" },
        { id: "2", name: "Valeria" },
        { id: "3", name: "Juana" },
      ];
      this.saveToStorage();
    }
  }

  // Sistema de observadores
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const store = new AppStore();
