import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import {
  expenseService,
  paymentService,
  sharedExpenseService,
  userProfileService,
  contactService,
  startExpensesListener,
  startPaymentsListener,
  startSeListener,
  markNotificationsReadInDb,
  PAGE_SIZE,
} from "./services/databaseService";
import { buildDocNotification } from "./services/notificationBuilders";
import { startInviteListener } from "./services/notificationService";
import { showToast } from "./util/toast";
import type AppState from "./state/AppState";
import type {
  UserProfile,
  Contact,
  Expense,
  Payment,
  SharedExpense,
  SharedExpenseParticipant,
  ViewType,
  AppNotification,
} from "./types";

const CACHE_KEY_CURRENT_EXPENSE = "splitexpenses_current_id";

export default class AppStore {
  private currentUser: UserProfile | null = null;
  private contacts: Contact[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private expensesLimit: number = PAGE_SIZE;
  private paymentsLimit: number = PAGE_SIZE;
  private hasMoreExpenses: boolean = false;
  private hasMorePayments: boolean = false;
  private notifications: AppNotification[] = [];
  private stopDataListeners: (() => void) | null = null;
  private stopInviteListener: (() => void) | null = null;
  private readonly listenerStart: Timestamp = Timestamp.now();
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
      await userProfileService.ensureProfile(firebaseUser);

      this.currentUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? firebaseUser.email ?? "Usuario",
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL,
      };

      const [contacts, sharedExpenses] = await Promise.all([
        contactService.getContacts(firebaseUser.uid),
        sharedExpenseService.getForUser(firebaseUser.uid, firebaseUser.email || ""),
      ]);

      this.contacts = contacts;
      this.sharedExpenses = sharedExpenses;

      // Start invite listener to detect new group invites in real time
      this.stopInviteListener = startInviteListener(
        this.sharedExpenses,
        this.currentUser,
        (newSE) => {
          // Guard against duplicates (e.g. own SE creation fires the listener)
          if (this.sharedExpenses.some((se) => se.id === newSE.id)) return;
          this.sharedExpenses.unshift(newSE);
          this.state.notify(this);
        }
      );

      // Restore cached current shared expense
      const cachedId = localStorage.getItem(CACHE_KEY_CURRENT_EXPENSE);
      if (cachedId && this.sharedExpenses.some((se) => se.id === cachedId)) {
        this.currentSharedExpenseId = cachedId;
        this._startDataListeners(cachedId);
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
    this.stopDataListeners?.();
    this.stopDataListeners = null;
    this.stopInviteListener?.();
    this.stopInviteListener = null;
    this.currentUser = null;
    this.contacts = [];
    this.expenses = [];
    this.payments = [];
    this.sharedExpenses = [];
    this.currentSharedExpenseId = null;
    this.expensesLimit = PAGE_SIZE;
    this.paymentsLimit = PAGE_SIZE;
    this.hasMoreExpenses = false;
    this.hasMorePayments = false;
    this.notifications = [];
    localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    this.state.notify(this);
  }

  // ==================== CONTACTS ====================
  getContacts(): Contact[] {
    return [...this.contacts];
  }

  async addContact(email: string, displayName?: string): Promise<void> {
    if (!this.currentUser) return;
    const alreadyExists = this.contacts.some((c) => c.email === email);
    if (alreadyExists) return;

    const contact: Contact = {
      uid: "",
      email,
      displayName: displayName || email,
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

  getHasMoreExpenses(): boolean {
    return this.hasMoreExpenses;
  }

  getHasMorePayments(): boolean {
    return this.hasMorePayments;
  }

  async addExpense(expense: Expense, currentView: ViewType): Promise<void> {
    try {
      const se = this.sharedExpenses.find((s) => s.id === expense.sharedExpenseId);
      expense.creatorUid = se?.creatorUid ?? "";
      expense.recordedByUid = this.currentUser?.uid ?? "";
      const { totalAmount, expensesCount, netPaid } =
        await expenseService.createExpense(expense);
      // Patch SE aggregates locally; SE document listener will confirm later
      this.patchLocalSE(expense.sharedExpenseId, { totalAmount, expensesCount, netPaid });
      // Expense list is updated by the data listener — no local push needed
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
      const { totalAmount, expensesCount, netPaid } =
        await expenseService.deleteExpense(id, sharedExpenseId);
      this.patchLocalSE(sharedExpenseId, { totalAmount, expensesCount, netPaid });
      // Expense list is updated by the data listener — no local filter needed
    } catch (error) {
      console.error("Failed to delete expense:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  loadMoreExpenses(): void {
    if (!this.currentSharedExpenseId || !this.hasMoreExpenses) return;
    this.expensesLimit += PAGE_SIZE;
    this._startDataListeners(this.currentSharedExpenseId);
  }

  loadMorePayments(): void {
    if (!this.currentSharedExpenseId || !this.hasMorePayments) return;
    this.paymentsLimit += PAGE_SIZE;
    this._startDataListeners(this.currentSharedExpenseId);
  }

  private patchLocalSE(id: string, updates: Partial<SharedExpense>): void {
    const i = this.sharedExpenses.findIndex((se) => se.id === id);
    if (i !== -1) this.sharedExpenses[i] = { ...this.sharedExpenses[i], ...updates };
  }

  // ==================== PAYMENTS ====================
  getPayments(): Payment[] {
    return [...this.payments];
  }

  async addPayment(payment: Payment, currentView: ViewType): Promise<void> {
    try {
      const se = this.sharedExpenses.find((s) => s.id === payment.sharedExpenseId);
      payment.creatorUid = se?.creatorUid ?? "";
      payment.recordedByUid = this.currentUser?.uid ?? "";
      const { netPaid } = await paymentService.createPayment(payment);
      this.patchLocalSE(payment.sharedExpenseId, { netPaid });
      // Payment list is updated by the data listener — no local push needed
    } catch (error) {
      console.error("Failed to create payment:", error);
      throw error;
    } finally {
      this.state.setCurrentView(currentView, this);
    }
  }

  async deletePayment(id: string, currentView: ViewType): Promise<void> {
    const sharedExpenseId = this.currentSharedExpenseId || "";
    try {
      const { netPaid } = await paymentService.deletePayment(id, sharedExpenseId);
      this.patchLocalSE(sharedExpenseId, { netPaid });
      // Payment list is updated by the data listener — no local filter needed
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

  isPendingInvite(se: SharedExpense): boolean {
    return (
      !!this.currentUser &&
      se.participantEmails.includes(this.currentUser.email) &&
      !se.participantUids.includes(this.currentUser.uid)
    );
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
        expensesCount: 0,
        netPaid: {},
        createdAt: sharedExpense.createdAt,
      });
      sharedExpense.id = sharedExpenseId;
      this.sharedExpenses.unshift(sharedExpense);
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

  async acceptInvite(seId: string): Promise<void> {
    if (!this.currentUser) return;
    await sharedExpenseService.resolveParticipantUid(
      seId,
      this.currentUser.email,
      this.currentUser.uid
    );
    // Update local SE to reflect accepted state
    const se = this.sharedExpenses.find((s) => s.id === seId);
    if (se) {
      se.participantUids = [...se.participantUids, this.currentUser.uid];
      se.participants = se.participants.map((p) =>
        p.email === this.currentUser!.email
          ? { ...p, uid: this.currentUser!.uid }
          : p
      );
    }
    await this.setCurrentSharedExpenseId(seId);
    this.state.setCurrentView("dashboard", this);
  }

  // ==================== CURRENT SHARED EXPENSE ====================
  getCurrentSharedExpenseId(): string | null {
    return this.currentSharedExpenseId;
  }

  clearCurrentSharedExpense(): void {
    this.stopDataListeners?.();
    this.stopDataListeners = null;
    this.currentSharedExpenseId = null;
    this.expenses = [];
    this.expensesLimit = PAGE_SIZE;
    this.hasMoreExpenses = false;
    this.payments = [];
    this.paymentsLimit = PAGE_SIZE;
    this.hasMorePayments = false;
    localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
  }

  async setCurrentSharedExpenseId(id: string | null): Promise<void> {
    this.stopDataListeners?.();
    this.stopDataListeners = null;
    this.expenses = [];
    this.payments = [];
    this.expensesLimit = PAGE_SIZE;
    this.paymentsLimit = PAGE_SIZE;
    this.currentSharedExpenseId = id;

    if (id) {
      this._startDataListeners(id);
      localStorage.setItem(CACHE_KEY_CURRENT_EXPENSE, id);
    } else {
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
      this.state.notify(this);
    }
  }

  private _startDataListeners(seId: string): void {
    // Stop existing listeners before starting new ones
    this.stopDataListeners?.();

    const seName = this.sharedExpenses.find((se) => se.id === seId)?.name ?? "";

    const unsub1 = startExpensesListener(
      seId,
      this.expensesLimit,
      (expenses, hasMore, changes) => {
        this.expenses = expenses;
        this.hasMoreExpenses = hasMore;
        this._processDocChanges(changes, "expense_added", seId, seName);
        this.state.notify(this);
      }
    );

    const unsub2 = startPaymentsListener(
      seId,
      this.paymentsLimit,
      (payments, hasMore, changes) => {
        this.payments = payments;
        this.hasMorePayments = hasMore;
        this._processDocChanges(changes, "payment_added", seId, seName);
        this.state.notify(this);
      }
    );

    const unsub3 = startSeListener(seId, (se) => {
      this.patchLocalSE(se.id, se);
      this.state.notify(this);
    });

    this.stopDataListeners = () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }

  private _processDocChanges(
    changes: Array<{ type: string; item: Expense | Payment }>,
    type: "expense_added" | "payment_added",
    seId: string,
    seName: string
  ): void {
    if (!this.currentUser) return;
    for (const { type: changeType, item } of changes) {
      if (changeType !== "added") continue;
      const result = buildDocNotification(
        item as unknown as { unreadBy?: string[]; createdAt: Timestamp; amount?: number; description?: string; fromEmail?: string; toEmail?: string },
        item.id,
        type,
        seId,
        seName,
        this.currentUser.uid,
        this.listenerStart
      );
      if (!result) continue;
      this.notifications.unshift(result.notification);
      if (result.isRealtime) showToast(result.notification.message, "info");
    }
  }

  // ==================== NOTIFICATIONS ====================
  getUnreadCount(): number {
    const id = this.currentSharedExpenseId;
    if (!id) return 0;
    return this.notifications.filter((n) => n.seId === id).length;
  }

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  markNotificationsRead(): void {
    const id = this.currentSharedExpenseId;
    if (!id || !this.currentUser) return;
    const toMark = this.notifications.filter((n) => n.seId === id);
    this.notifications = this.notifications.filter((n) => n.seId !== id);
    // Fire-and-forget: clear unreadBy in Firestore
    markNotificationsReadInDb(toMark, this.currentUser.uid).catch((err) =>
      console.error("Failed to mark notifications read:", err)
    );
  }
}
