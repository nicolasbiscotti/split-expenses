import { expenseService, paymentService } from "./services/databaseService";
import type { Participant, Expense, Payment } from "./types";

export default class AppStore {
  users: Participant[];
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

  addExpense(expense: Expense, currentView: string, store: AppStore) {
    expenseService
      .createExpense(expense)
      .then((expenseId) => {
        expense.id = expenseId;
        this.expenses.push(expense);
        console.log("expense created id ==> ", expenseId);
      })
      .catch((error) => console.log("fail to create the expense ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  deleteExpense(id: string, currentView: string, store: AppStore) {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.saveToStorage();
    this.notify(currentView, store);
  }

  addPayment(payment: Payment, currentView: string, store: AppStore) {
    paymentService
      .createPayment(payment)
      .then((paymentId) => {
        payment.id = paymentId;
        this.payments.push(payment);
        console.log("payment created id ==> ", paymentId);
      })
      .catch((error) => console.log("fail to create the payment ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  deletePayment(id: string, currentView: string, store: AppStore) {
    this.payments = this.payments.filter((p) => p.id !== id);
    this.saveToStorage();
    this.notify(currentView, store);
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

    if (usersData) {
      this.users = JSON.parse(usersData);
    }

    expenseService
      .getExpenses()
      .then((expenses: Expense[]) => {
        this.expenses = expenses;
        this.notify("dashboard", this);
        console.log("expenses loaded ==> ", expenses);
      })
      .catch((error) =>
        console.log("error loading expenses from firebase ==> ", error)
      );

    paymentService
      .getPayments()
      .then((payments) => {
        this.payments = payments;
        this.notify("dashboard", this);
        console.log("payments loaded ==> ", payments);
      })
      .catch((error) =>
        console.log("error loading payments from firebase ==> ", error)
      );

    if (this.users.length === 0) {
      this.users = [
        { id: "1", name: "Fer" },
        { id: "2", name: "Seba" },
        { id: "3", name: "Nata" },
      ];
      this.saveToStorage();
    }
  }

  subscribe(listener: (currentView: string, store: AppStore) => any) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l: any) => l !== listener);
    };
  }

  notify(currentView: string, store: AppStore) {
    this.listeners.forEach(
      (listener: (currentView: string, store: AppStore) => any) =>
        listener(currentView, store)
    );
  }
}
