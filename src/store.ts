import {
  expenseService,
  paymentService,
  sharedExpenseService,
  type CreateSharedExpenseInput,
} from "./services/databaseService";
import { signInWithGoogle, signOut } from "./auth/authService";
import { userService } from "./services/userService";
import { globalContactService } from "./services/globalContactService";
import { contactAliasService } from "./services/contactAliasService";
import {
  getPendingInvitationsByEmail,
  acceptPendingInvitation,
} from "./services/invitationService";
import type AppState from "./state/AppState";
import type { NewSharedExpenseData } from "./state/AppState";
import type {
  Expense,
  Payment,
  SharedExpense,
  ViewType,
  User,
  ResolvedContact,
} from "./types";

const CACHE_KEY_CURRENT_EXPENSE = "splitexpenses_current_id";

export default class AppStore {
  // Current shared expense data
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;

  // Current shared expense participants (resolved contacts)
  private currentParticipants: ResolvedContact[] = [];

  // User's contact list
  private userContacts: ResolvedContact[] = [];

  // Current user's own contact
  private currentUserContact: ResolvedContact | null = null;

  private state: AppState;
  private currentUser: User | null = null;

  constructor(state: AppState) {
    this.state = state;
  }

  startApp() {
    this.loadFromStorage();
  }

  // ==================== CURRENT USER CONTACT ====================
  getCurrentUserContact(): ResolvedContact | null {
    return this.currentUserContact;
  }

  // ==================== CONTACTS ====================
  /**
   * Get user's contact list (resolved with aliases)
   */
  getContacts(): ResolvedContact[] {
    return [...this.userContacts];
  }

  /**
   * Get contacts by IDs
   */
  getContactsByIds(ids: string[]): ResolvedContact[] {
    return this.userContacts.filter((c) => ids.includes(c.id));
  }

  /**
   * Add a new contact
   */
  async addContact(
    email: string,
    displayName: string
  ): Promise<ResolvedContact> {
    if (!this.currentUser) {
      throw new Error("User not logged in");
    }

    const newContact = await contactAliasService.createContactWithAlias(
      this.currentUser.uid,
      email,
      displayName
    );

    // Add to local list
    this.userContacts.push(newContact);

    return newContact;
  }

  // ==================== PARTICIPANTS (for current shared expense) ====================
  /**
   * Get participants for current shared expense
   */
  getParticipants(): ResolvedContact[] {
    return [...this.currentParticipants];
  }

  /**
   * Get participant by contact ID
   */
  getParticipantById(contactId: string): ResolvedContact | undefined {
    return this.currentParticipants.find((p) => p.id === contactId);
  }

  // ==================== EXPENSES ====================
  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  getExpensesBySharedExpense(sharedExpenseId: string): Expense[] {
    return this.expenses.filter((e) => e.sharedExpenseId === sharedExpenseId);
  }

  async addExpense(expense: Expense, currentView: ViewType): Promise<void> {
    const sharedExpense = this.getSharedExpense(expense.sharedExpenseId);

    try {
      const expenseId = await expenseService.createExpense(
        expense,
        sharedExpense?.createdBy || ""
      );
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
      await expenseService.deleteExpense(
        id,
        this.currentSharedExpenseId!,
        this.getSharedExpense(this.currentSharedExpenseId!)?.createdBy!
      );
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
    const sharedExpense = this.getSharedExpense(payment.sharedExpenseId);

    try {
      const paymentId = await paymentService.createPayment(
        payment,
        sharedExpense?.createdBy || ""
      );
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
      await paymentService.deletePayment(
        id,
        this.currentSharedExpenseId!,
        this.getSharedExpense(this.currentSharedExpenseId!)?.createdBy!
      );
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

  async createSharedExpense(data: NewSharedExpenseData): Promise<string> {
    const user = this.getCurrentUser()!;

    const createInput: CreateSharedExpenseInput = {
      name: data.name,
      description: data.description,
      type: data.type,
      participantContactIds: data.selectedContactIds,
      adminContactIds: data.adminContactIds,
    };

    try {
      const sharedExpenseId = await sharedExpenseService.create(
        createInput,
        user
      );

      // Add to local list
      const newSharedExpense: SharedExpense = {
        id: sharedExpenseId,
        name: data.name,
        description: data.description,
        type: data.type,
        status: "active",
        totalAmount: 0,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        adminContactIds: data.adminContactIds,
        participantContactIds: data.selectedContactIds,
        confirmedUserIds: [user.uid], // At minimum, creator is confirmed
      };

      this.sharedExpenses.push(newSharedExpense);

      console.log("Shared expense created with id:", sharedExpenseId);
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
      await sharedExpenseService.update(
        id,
        updates,
        this.sharedExpenses[index].createdBy
      );
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
      await this.loadCurrentSharedExpenseDetails();
      localStorage.setItem(CACHE_KEY_CURRENT_EXPENSE, id);
    } else {
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
      this.currentParticipants = [];
      this.expenses = [];
      this.payments = [];
    }
  }

  private loadCachedCurrentExpenseId(): void {
    const cachedId = localStorage.getItem(CACHE_KEY_CURRENT_EXPENSE);

    if (cachedId && this.getSharedExpense(cachedId)) {
      this.currentSharedExpenseId = cachedId;
      console.log("Restored current expense from cache:", cachedId);
    } else {
      localStorage.removeItem(CACHE_KEY_CURRENT_EXPENSE);
    }
  }

  // ==================== LOAD FROM STORAGE ====================
  async loadFromStorage(): Promise<void> {
    try {
      await this.loadUserData();
      this.loadCachedCurrentExpenseId();

      if (this.currentSharedExpenseId) {
        await this.loadCurrentSharedExpenseDetails();
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

  /**
   * Load user's data: contacts and shared expenses
   */
  private async loadUserData(): Promise<void> {
    if (!this.currentUser) return;

    const userId = this.currentUser.uid;
    const userEmail = this.currentUser.email;

    // Ensure user has a global contact
    let userGlobalContact = await globalContactService.getByUserId(userId);

    if (!userGlobalContact) {
      // Create global contact for user
      userGlobalContact = await globalContactService.createForUser(
        userEmail,
        userId
      );

      // Create alias for self
      await contactAliasService.setAlias(
        userId,
        userGlobalContact.id,
        this.currentUser.displayName
      );
    }

    // Resolve current user's contact
    this.currentUserContact = await contactAliasService.resolveContact(
      userId,
      userGlobalContact
    );

    // Load user's contact list
    this.userContacts = await contactAliasService.getUserContacts(userId);

    // If user has no contacts, add themselves
    if (this.userContacts.length === 0) {
      this.userContacts = [this.currentUserContact];
    } else if (
      !this.userContacts.find((c) => c.id === this.currentUserContact!.id)
    ) {
      // Ensure self is in contact list
      this.userContacts.unshift(this.currentUserContact);
    }

    // Load shared expenses
    this.sharedExpenses = await sharedExpenseService.getAll(userId);

    console.log("User data loaded:", {
      contacts: this.userContacts,
      sharedExpenses: this.sharedExpenses,
      userContact: this.currentUserContact,
    });
  }

  /**
   * Load details for current shared expense
   */
  private async loadCurrentSharedExpenseDetails(): Promise<void> {
    const currentExpenseId = this.getCurrentSharedExpenseId();
    const sharedExpense = this.getSharedExpense(currentExpenseId!);

    if (!sharedExpense || !this.currentUser) return;

    // Load expenses and payments
    const [expenses, payments] = await Promise.all([
      expenseService.getExpenses(
        currentExpenseId || "",
        sharedExpense.createdBy
      ),
      paymentService.getPayments(
        currentExpenseId || "",
        sharedExpense.createdBy
      ),
    ]);

    this.expenses = expenses;
    this.payments = payments;

    // Load participants (resolve global contacts with user's aliases)
    const globalContacts = await globalContactService.getByIds(
      sharedExpense.participantContactIds
    );

    this.currentParticipants = await contactAliasService.resolveContacts(
      this.currentUser.uid,
      globalContacts
    );

    console.log("Shared Expense details loaded:", {
      expenses,
      payments,
      participants: this.currentParticipants,
    });
  }

  // ==================== AUTH ====================
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async setCurrentUser(user: User | null): Promise<void> {
    this.currentUser = user;
    if (user) {
      await this.processPendingInvitations(user.email);
    }
  }

  async signInWithGoogle(): Promise<void> {
    const user = await signInWithGoogle();
    await userService.createOrUpdateUser(user);
    this.currentUser = user;

    // Link global contact to user (if exists)
    const linkedContact = await globalContactService.linkToUser(
      user.email,
      user.uid
    );

    // If contact was linked, sync all shared expenses
    if (linkedContact) {
      await sharedExpenseService.syncConfirmedUser(linkedContact.id, user.uid);
    }

    await this.processPendingInvitations(user.email);
  }

  async signOut(): Promise<void> {
    await signOut();
    this.currentUser = null;
    this.userContacts = [];
    this.sharedExpenses = [];
    this.currentSharedExpenseId = null;
    this.currentUserContact = null;
    this.state.setCurrentView("login", this);
  }

  private async processPendingInvitations(email: string): Promise<void> {
    const invitations = await getPendingInvitationsByEmail(email);

    for (const invitation of invitations) {
      try {
        await acceptPendingInvitation(invitation.id, this.currentUser!.uid);
        console.log("Auto-accepted invitation:", invitation.sharedExpenseName);
      } catch (error) {
        console.error("Error auto-accepting invitation:", error);
      }
    }
  }

  async getUsersByIds(uids: string[]): Promise<User[]> {
    return await userService.getUsersByIds(uids);
  }

  /**
   * Check if current user is admin of a shared expense
   */
  isCurrentUserAdmin(sharedExpense?: SharedExpense): boolean {
    if (!this.currentUserContact) return false;
    const se =
      sharedExpense || this.getSharedExpense(this.currentSharedExpenseId!);
    if (!se) return false;
    return se.adminContactIds.includes(this.currentUserContact.id);
  }
}
