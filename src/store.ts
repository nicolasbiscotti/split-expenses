import {
  expenseService,
  participantService,
  paymentService,
} from "./services/databaseService";
import type AppState from "./state/AppState";
import type {
  Participant,
  Expense,
  Payment,
  SharedExpense,
  ViewType,
} from "./types";

export default class AppStore {
  private participants: Participant[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private state: AppState;
  // private renderList: Render[] = [];

  constructor(state: AppState) {
    this.state = state;
    this.loadFromStorage();
  }

  // ------------------------------------------------------
  // Participants

  getParticipants() {
    return [...this.participants];
  }
  addParticipant(participant: Participant): void {}

  getParticipantsByIds(ids: string[]): Participant[] {
    return this.participants.filter((p) => ids.includes(p.id));
  }

  // -----------------------------------------------------
  // Expenses

  getExpenses() {
    return [...this.expenses];
  }

  getExpensesBySharedExpense(sharedExpenseId: string): Expense[] {
    return this.expenses.filter((e) => e.sharedExpenseId === sharedExpenseId);
  }

  addExpense(expense: Expense, currentView: ViewType, store: AppStore) {
    expenseService
      .createExpense(expense)
      .then((expenseId) => {
        expense.id = expenseId;
        this.expenses.push(expense);
        console.log("expense created id ==> ", expenseId);
      })
      .catch((error) => console.log("fail to create the expense ==> ", error))
      .finally(() => this.state.setCurrentView(currentView, store));
  }

  deleteExpense(id: string, currentView: ViewType, store: AppStore) {
    expenseService
      .deleteExpense(id)
      .then(() => {
        this.expenses = this.expenses.filter((e) => e.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.state.setCurrentView(currentView, store));
  }

  // -------------------------------------------------------------
  // Payments

  getPayments() {
    return [...this.payments];
  }

  getPaymentsBySharedExpense(sharedExpenseId: string): Payment[] {
    return this.payments.filter((p) => p.sharedExpenseId === sharedExpenseId);
  }

  addPayment(payment: Payment, currentView: ViewType, store: AppStore) {
    paymentService
      .createPayment(payment)
      .then((paymentId) => {
        payment.id = paymentId;
        this.payments.push(payment);
        console.log("payment created id ==> ", paymentId);
      })
      .catch((error) => console.log("fail to create the payment ==> ", error))
      .finally(() => this.state.setCurrentView(currentView, store));
  }
  deletePayment(id: string, currentView: ViewType, store: AppStore) {
    paymentService
      .deletePayment(id)
      .then(() => {
        this.payments = this.payments.filter((p) => p.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.state.setCurrentView(currentView, store));
  }

  // ---------------------------------------
  // Shared Expenses
  getSharedExpenses(): SharedExpense[] {
    return [...this.sharedExpenses];
  }

  getSharedExpense(id: string): SharedExpense | undefined {
    return this.sharedExpenses.find((se) => se.id === id);
  }

  addSharedExpense(sharedExpense: SharedExpense): void {
    this.sharedExpenses.push(sharedExpense);
    // this.saveToStorage();
    // this.notify();
  }

  updateSharedExpense(id: string, updates: Partial<SharedExpense>): void {
    const index = this.sharedExpenses.findIndex((se) => se.id === id);
    if (index !== -1) {
      this.sharedExpenses[index] = {
        ...this.sharedExpenses[index],
        ...updates,
      };
      // this.saveToStorage();
      // this.notify();
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
    // this.notify();
  }

  loadFromStorage() {
    this.loadData()
      .then(() => {
        if (this.participants.length === 0) {
          participantService
            .createParticipantList()
            .then(() => this.loadData());
        }
      })
      .catch((error) =>
        console.log("error loading data from firebase ==> ", error)
      )
      .finally(() => this.state.setCurrentView("dashboard", this));
  }

  private loadData = async () => {
    return Promise.all([
      expenseService.getExpenses(),
      paymentService.getPayments(),
      participantService.getParticipants(),
    ]).then((data) => {
      this.expenses = data[0];
      console.log("expenses loaded ==> ", data[0]);

      this.payments = data[1];
      console.log("payments loaded ==> ", data[1]);

      this.participants = data[2];
      console.log("participants loaded ==> ", data[2]);
    });
  };
}
