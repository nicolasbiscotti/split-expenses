import {
  expenseService,
  participantService,
  paymentService,
  sharedExpenseService, // Necesitas crear este servicio
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

  addParticipant(participant: Participant): void {
    // Implementar si es necesario
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
      console.log("Expense created with id:", expenseId);
    } catch (error) {
      console.error("Failed to create expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deleteExpense(id: string, currentView: ViewType): Promise<void> {
    try {
      await expenseService.deleteExpense(id);
      this.expenses = this.expenses.filter((e) => e.id !== id);
      console.log("Expense deleted:", id);
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
      console.log("Payment created with id:", paymentId);
    } catch (error) {
      console.error("Failed to create payment:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deletePayment(id: string, currentView: ViewType): Promise<void> {
    try {
      await paymentService.deletePayment(id);
      this.payments = this.payments.filter((p) => p.id !== id);
      console.log("Payment deleted:", id);
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
      // Crear en Firebase (debe retornar el ID generado)
      const sharedExpenseId = await sharedExpenseService.create(sharedExpense);

      // Actualizar el objeto con el ID
      sharedExpense.id = sharedExpenseId;

      // Agregar a la lista local
      this.sharedExpenses.push(sharedExpense);

      // Establecer como gasto compartido actual (guarda en cache)
      this.setCurrentSharedExpenseId(sharedExpenseId);

      console.log("Shared expense created with id:", sharedExpenseId);
      return sharedExpenseId;
    } catch (error) {
      console.error("Failed to create shared expense:", error);
      throw error;
    }
  }

  updateSharedExpense(id: string, updates: Partial<SharedExpense>): void {
    const index = this.sharedExpenses.findIndex((se) => se.id === id);
    if (index !== -1) {
      this.sharedExpenses[index] = {
        ...this.sharedExpenses[index],
        ...updates,
      };
      // TODO: Actualizar en Firebase también
      // await sharedExpenseService.update(id, updates);
    }
  }

  async closeSharedExpense(id: string): Promise<void> {
    this.updateSharedExpense(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
    });
    // TODO: Sincronizar con Firebase
  }

  // ==================== CURRENT SHARED EXPENSE ====================
  getCurrentSharedExpenseId(): string | null {
    return this.currentSharedExpenseId;
  }

  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;

    // Guardar en localStorage como cache
    if (id) {
      localStorage.setItem(CACHE_KEY_CURRENT_EXPENSE, id);
    } else {
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  private loadCachedCurrentExpenseId(): void {
    const cachedId = localStorage.getItem(CACHE_KEY_CURRENT_EXPENSE);

    // Solo usar el cache si el gasto compartido existe
    if (cachedId && this.getSharedExpense(cachedId)) {
      this.currentSharedExpenseId = cachedId;
      console.log("Restored current expense from cache:", cachedId);
    } else {
      // Si no existe, limpiar el cache
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  // ==================== LOAD FROM STORAGE ====================
  async loadFromStorage(): Promise<void> {
    try {
      await this.loadData();

      // Cargar el último gasto activo desde cache
      this.loadCachedCurrentExpenseId();

      // Si no hay participantes, crear los por defecto
      if (this.participants.length === 0) {
        await participantService.createParticipantList();
        await this.loadData();
      }
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
    } finally {
      // Decidir vista inicial
      const initialView = this.currentSharedExpenseId
        ? "dashboard"
        : "shared-expense-list";

      this.state.setCurrentView(initialView, this);
    }
  }

  private async loadData(): Promise<void> {
    const [expenses, payments, participants, sharedExpenses] =
      await Promise.all([
        expenseService.getExpenses(),
        paymentService.getPayments(),
        participantService.getParticipants(),
        sharedExpenseService.getAll(), // Necesitas implementar este servicio
      ]);

    this.expenses = expenses;
    this.payments = payments;
    this.participants = participants;
    this.sharedExpenses = sharedExpenses;

    console.log("Data loaded:", {
      expenses: expenses.length,
      payments: payments.length,
      participants: participants.length,
      sharedExpenses: sharedExpenses.length,
    });
  }
}

/**
 * NOTA: Necesitas crear sharedExpenseService en databaseService.ts:
 *
 * export const sharedExpenseService = {
 *   create: async (data: Omit<SharedExpense, 'id'>): Promise<string> => {
 *     const docRef = await addDoc(collection(db, 'sharedExpenses'), data);
 *     return docRef.id;
 *   },
 *
 *   getAll: async (): Promise<SharedExpense[]> => {
 *     const snapshot = await getDocs(collection(db, 'sharedExpenses'));
 *     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedExpense));
 *   },
 *
 *   update: async (id: string, updates: Partial<SharedExpense>): Promise<void> => {
 *     await updateDoc(doc(db, 'sharedExpenses', id), updates);
 *   }
 * };
 */
