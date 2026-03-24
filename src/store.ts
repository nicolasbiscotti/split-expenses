import {
  expenseService,
  participantService,
  paymentService,
  sharedExpenseService,
} from "./services/databaseService";
import type AppState from "./state/AppState";
import type {
  Participant,
  Expense,
  Payment,
  SharedExpense,
  ViewType,
} from "./types";

const CACHE_KEY_CURRENT_EXPENSE = "splitexpenses_current_id";

export default class AppStore {
  private participants: Participant[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private state: AppState;

  constructor(state: AppState) {
    this.state = state;
    this.loadFromStorage();
  }

  // ==================== PARTICIPANTS ====================
  getParticipants(): Participant[] {
    return [...this.participants];
  }

  getParticipantsByIds(ids: string[]): Participant[] {
    return this.participants.filter((p) => ids.includes(p.id));
  }

  // ==================== EXPENSES ====================
  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  getExpensesBySharedExpense(sharedExpenseId: string): Expense[] {
    return this.expenses.filter((e) => e.sharedExpenseId === sharedExpenseId);
  }

  async addExpense(expense: Expense, currentView: ViewType): Promise<void> {
    try {
      const expenseId = await expenseService.createExpense(expense);
      expense.id = expenseId;
      this.expenses.push(expense);
    } catch (error) {
      console.error("Failed to create expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deleteExpense(id: string, currentView: ViewType): Promise<void> {
    try {
      await expenseService.deleteExpense(id, this.currentSharedExpenseId || "");
      this.expenses = this.expenses.filter((e) => e.id !== id);
    } catch (error) {
      console.error("Failed to delete expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  // ==================== PAYMENTS ====================
  getPayments(): Payment[] {
    return [...this.payments];
  }

  getPaymentsBySharedExpense(sharedExpenseId: string): Payment[] {
    return this.payments.filter((p) => p.sharedExpenseId === sharedExpenseId);
  }

  async addPayment(payment: Payment, currentView: ViewType): Promise<void> {
    try {
      const paymentId = await paymentService.createPayment(payment);
      payment.id = paymentId;
      this.payments.push(payment);
    } catch (error) {
      console.error("Failed to create payment:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deletePayment(id: string, currentView: ViewType): Promise<void> {
    try {
      await paymentService.deletePayment(id, this.currentSharedExpenseId || "");
      this.payments = this.payments.filter((p) => p.id !== id);
    } catch (error) {
      console.error("Failed to delete payment:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  // ==================== SHARED EXPENSES ====================
  getSharedExpenses(): SharedExpense[] {
    return [...this.sharedExpenses];
  }

  getSharedExpense(id: string): SharedExpense | undefined {
    return this.sharedExpenses.find((se) => se.id === id);
  }

  async createSharedExpense(sharedExpense: SharedExpense): Promise<string> {
    try {
      const sharedExpenseId = await sharedExpenseService.create({
        name: sharedExpense.name,
        description: sharedExpense.description,
        type: sharedExpense.type,
        status: sharedExpense.status,
        participantIds: sharedExpense.participantIds,
        totalAmount: sharedExpense.totalAmount,
        createdAt: sharedExpense.createdAt,
      });
      sharedExpense.id = sharedExpenseId;
      this.sharedExpenses.push(sharedExpense);
      await this.setCurrentSharedExpenseId(sharedExpenseId);
      return sharedExpenseId;
    } catch (error) {
      console.error("Failed to create shared expense:", error);
      throw error;
    }
  }

  async updateSharedExpense(
    id: string,
    updates: Partial<SharedExpense>
  ): Promise<void> {
    const index = this.sharedExpenses.findIndex((se) => se.id === id);
    if (index !== -1) {
      this.sharedExpenses[index] = {
        ...this.sharedExpenses[index],
        ...updates,
      };
      await sharedExpenseService.update(id, updates);
    }
  }

  async closeSharedExpense(id: string): Promise<void> {
    await this.updateSharedExpense(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
    });
  }

  // ==================== CURRENT SHARED EXPENSE ====================
  getCurrentSharedExpenseId(): string | null {
    return this.currentSharedExpenseId;
  }

  async setCurrentSharedExpenseId(id: string | null) {
    this.currentSharedExpenseId = id;

    if (id) {
      await this.loadData();
      localStorage.setItem(CACHE_KEY_CURRENT_EXPENSE, id);
    } else {
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  private loadCachedCurrentExpenseId(): void {
    const cachedId = localStorage.getItem(CACHE_KEY_CURRENT_EXPENSE);

    // Only use the cache if the shared expense still exists
    if (cachedId && this.getSharedExpense(cachedId)) {
      this.currentSharedExpenseId = cachedId;
    } else {
      // Stale cache — clear it
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  // ==================== LOAD FROM STORAGE ====================
  async loadFromStorage(): Promise<void> {
    try {
      this.loadCachedCurrentExpenseId();
      await this.loadData();
      if (this.participants.length === 0) {
        await participantService.createParticipantList();
        await this.loadData();
      }
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
    } finally {
      const initialView = this.currentSharedExpenseId
        ? "dashboard"
        : "shared-expense-list";

      this.state.setCurrentView(initialView, this);
    }
  }

  private async loadData(): Promise<void> {
    const [expenses, payments, participants, sharedExpenses] =
      await Promise.all([
        expenseService.getExpenses(this.currentSharedExpenseId || ""),
        paymentService.getPayments(this.currentSharedExpenseId || ""),
        participantService.getParticipants(),
        sharedExpenseService.getAll(),
      ]);

    this.expenses = expenses;
    this.payments = payments;
    this.participants = participants;
    this.sharedExpenses = sharedExpenses;
  }
}
