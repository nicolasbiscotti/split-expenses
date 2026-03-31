import type { User } from "firebase/auth";
import {
  expenseService,
  paymentService,
  sharedExpenseService,
  userProfileService,
  contactService,
} from "./services/databaseService";
import type AppState from "./state/AppState";
import type {
  UserProfile,
  Contact,
  Expense,
  Payment,
  SharedExpense,
  SharedExpenseParticipant,
  ViewType,
} from "./types";

const CACHE_KEY_CURRENT_EXPENSE = "splitexpenses_current_id";

export default class AppStore {
  private currentUser: UserProfile | null = null;
  private contacts: Contact[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private state: AppState;

  constructor(state: AppState) {
    this.state = state;
  }

  // ==================== AUTH ====================
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  async initializeForUser(firebaseUser: User): Promise<void> {
    try {
      // Upsert user profile in Firestore
      await userProfileService.ensureProfile(firebaseUser);

      this.currentUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? firebaseUser.email ?? "Usuario",
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL,
      };

      // Load contacts and shared expenses in parallel
      const [contacts, sharedExpenses] = await Promise.all([
        contactService.getContacts(firebaseUser.uid),
        sharedExpenseService.getForUser(firebaseUser.uid, firebaseUser.email || ''),
      ]);

      this.contacts = contacts;
      this.sharedExpenses = sharedExpenses;

      // Resolve any pending invite (SE where user's email appears but UID not yet stored)
      await this.resolveInvites(firebaseUser.uid, firebaseUser.email ?? "");

      // Restore cached current shared expense
      const cachedId = localStorage.getItem(CACHE_KEY_CURRENT_EXPENSE);
      if (cachedId && this.sharedExpenses.some((se) => se.id === cachedId)) {
        this.currentSharedExpenseId = cachedId;
        await this.loadExpensesAndPayments();
      } else {
        localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
        this.currentSharedExpenseId = null;
      }

      const initialView = this.currentSharedExpenseId
        ? "dashboard"
        : "shared-expense-list";
      this.state.setCurrentView(initialView, this);
    } catch (error) {
      console.error("Failed to initialize for user:", error);
      this.state.notify(this);
    }
  }

  clearUserData(): void {
    this.currentUser = null;
    this.contacts = [];
    this.expenses = [];
    this.payments = [];
    this.sharedExpenses = [];
    this.currentSharedExpenseId = null;
    localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    this.state.notify(this);
  }

  // Resolve shared expenses where the user was invited by email but UID not yet stored
  private async resolveInvites(uid: string, email: string): Promise<void> {
    if (!email) return;
    const pendingSEs = await sharedExpenseService.getByParticipantEmail(uid, email);

    const unresolved = pendingSEs.filter((se) => !se.participantUids.includes(uid));
    if (unresolved.length === 0) return;

    await Promise.all(
      unresolved.map((se) =>
        sharedExpenseService.resolveParticipantUid(se.id, email, uid)
      )
    );

    // Reload shared expenses to include the newly resolved ones
    this.sharedExpenses = await sharedExpenseService.getForUser(uid, email);
  }

  // ==================== CONTACTS ====================
  getContacts(): Contact[] {
    return [...this.contacts];
  }

  async addContact(email: string): Promise<void> {
    if (!this.currentUser) return;
    const alreadyExists = this.contacts.some((c) => c.email === email);
    if (alreadyExists) return;

    const contact: Contact = {
      uid: "",
      email,
      displayName: email,
    };

    await contactService.addContact(this.currentUser.uid, contact);
    this.contacts.push(contact);
  }

  async removeContact(contactId: string): Promise<void> {
    if (!this.currentUser) return;
    await contactService.removeContact(this.currentUser.uid, contactId);
    this.contacts = this.contacts.filter((c) => {
      const id = c.email.replace(/[^a-zA-Z0-9]/g, "_");
      return id !== contactId;
    });
  }

  // ==================== EXPENSES ====================
  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  async addExpense(expense: Expense, currentView: ViewType): Promise<void> {
    try {
      const expenseId = await expenseService.createExpense(expense);
      expense.id = expenseId;
      this.expenses.push(expense);
      await this.syncSharedExpenseTotal(expense.sharedExpenseId);
    } catch (error) {
      console.error("Failed to create expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deleteExpense(id: string, currentView: ViewType): Promise<void> {
    const sharedExpenseId = this.currentSharedExpenseId || "";
    try {
      await expenseService.deleteExpense(id, sharedExpenseId);
      this.expenses = this.expenses.filter((e) => e.id !== id);
      await this.syncSharedExpenseTotal(sharedExpenseId);
    } catch (error) {
      console.error("Failed to delete expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  private async syncSharedExpenseTotal(sharedExpenseId: string): Promise<void> {
    const newTotal = this.expenses
      .filter((e) => e.sharedExpenseId === sharedExpenseId)
      .reduce((sum, e) => sum + e.amount, 0);
    await this.updateSharedExpense(sharedExpenseId, { totalAmount: newTotal });
  }

  // ==================== PAYMENTS ====================
  getPayments(): Payment[] {
    return [...this.payments];
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

  getParticipantsForSharedExpense(seId: string): SharedExpenseParticipant[] {
    return this.sharedExpenses.find((se) => se.id === seId)?.participants ?? [];
  }

  async createSharedExpense(sharedExpense: SharedExpense): Promise<string> {
    try {
      const sharedExpenseId = await sharedExpenseService.create({
        name: sharedExpense.name,
        description: sharedExpense.description,
        type: sharedExpense.type,
        status: sharedExpense.status,
        creatorUid: sharedExpense.creatorUid,
        participants: sharedExpense.participants,
        participantUids: sharedExpense.participantUids,
        participantEmails: sharedExpense.participantEmails,
        totalAmount: sharedExpense.totalAmount,
        createdAt: sharedExpense.createdAt,
      });
      sharedExpense.id = sharedExpenseId;
      this.sharedExpenses.unshift(sharedExpense); // newest first
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

  async setCurrentSharedExpenseId(id: string | null): Promise<void> {
    this.currentSharedExpenseId = id;

    if (id) {
      await this.loadExpensesAndPayments();
      localStorage.setItem(CACHE_KEY_CURRENT_EXPENSE, id);
    } else {
      this.expenses = [];
      this.payments = [];
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  private async loadExpensesAndPayments(): Promise<void> {
    const id = this.currentSharedExpenseId || "";
    const [expenses, payments] = await Promise.all([
      expenseService.getExpenses(id),
      paymentService.getPayments(id),
    ]);
    this.expenses = expenses;
    this.payments = payments;
  }
}
