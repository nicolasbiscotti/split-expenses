import {
  expenseService,
  paymentService,
  sharedExpenseService,
} from "./services/databaseService";
import { signInWithGoogle, signOut } from "./auth/authService";
import { userService } from "./services/userService";
import {
  getPendingInvitationsByEmail,
  acceptPendingInvitation,
} from "./services/invitationService";
import type AppState from "./state/AppState";
import type {
  Participant,
  Expense,
  Payment,
  SharedExpense,
  ViewType,
  User,
  Contact,
} from "./types";
import { contactService } from "./services/contactServices";
import type { NewSharedExpenseData } from "./state/AppState";
import { participantService } from "./services/participantServices";

const CACHE_KEY_CURRENT_EXPENSE = "splitexpenses_current_id";

export default class AppStore {
  private participants: Participant[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private contacts: Contact[] = [];
  private state: AppState;

  constructor(state: AppState) {
    this.state = state;
  }

  startApp() {
    this.loadFromStorage();
  }

  // ==================== PARTICIPANTS ====================
  getParticipants(): Participant[] {
    return [...this.participants];
  }

  getParticipantsByIds(ids: string[]): Participant[] {
    return this.participants.filter((p) => ids.includes(p.id));
  }

  // addParticipant(participant: Participant): void {
  //   // Implementar si es necesario
  // }

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

  async createSharedExpense(
    sharedExpenseData: NewSharedExpenseData
  ): Promise<string> {
    const user = this.getCurrentUser()!;
    const currentUserId = user.uid;

    const participantsToCreate: Omit<Participant, "id">[] =
      sharedExpenseData.participants.map((p) => ({
        name: p.name,
        isAdmin: p.isAdmin,
        contactId: p.contactId,
        email: p.email,
        appUserId: p.appUserId,
      }));

    const currentSharedExpenseData: Omit<SharedExpense, "id"> = {
      name: sharedExpenseData.name,
      description: sharedExpenseData.description,
      type: sharedExpenseData.type,
      status: "active",
      totalAmount: 0,

      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      administrators: [currentUserId],
      participants: [currentUserId],

      participantsPendingConfirmation: sharedExpenseData.participants
        .filter((p) => p.appUserId !== currentUserId)
        .map(
          (p) => p.contactId || "pending participant added without contactId"
        ),
      participantContactIds: sharedExpenseData.participants.map(
        (p) => p.contactId || "participant contactId added without contactId"
      ),
    };

    const currentSharedExpense: SharedExpense = {
      id: "",
      ...currentSharedExpenseData,
    };

    try {
      if (user !== null) {
        const sharedExpenseId = await sharedExpenseService.create(
          { ...currentSharedExpenseData },
          participantsToCreate,
          user
        );

        currentSharedExpense.id = sharedExpenseId;
        this.sharedExpenses.push(currentSharedExpense);

        console.log("Shared expense created with id ==> ", sharedExpenseId);
        return sharedExpenseId;
      }

      console.log("Shared could not be created without logged user ==>");
      return "";
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
      // TODO: Actualizar en Firebase también
      await sharedExpenseService.update(
        id,
        updates,
        this.sharedExpenses[index].createdBy
      );
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

  async setCurrentSharedExpenseId(id: string | null) {
    this.currentSharedExpenseId = id;

    if (id) {
      await this.loadCurredSharedExpenseDetails();
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

  // ==================== CONTACTS ============================
  getContacts(): Contact[] {
    return [...this.contacts];
  }

  getContactsToBeParticipants(ids: string[]): Contact[] {
    return this.contacts.filter((c) => ids.includes(c.id));
  }

  // ==================== LOAD FROM STORAGE ====================
  async loadFromStorage(): Promise<void> {
    try {
      this.loadCachedCurrentExpenseId();
      await this.loadData();
      if (this.contacts.length === 0) {
        await contactService.createContactList(
          this.getCurrentUser()?.uid || ""
        );
        await contactService.createContact(
          {
            name: this.getCurrentUser()?.displayName || "",
            email: this.getCurrentUser()?.email || "",
            appUserId: this.getCurrentUser()?.uid || null,
          },
          this.getCurrentUser()?.uid || ""
        );
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
    const [contacts, sharedExpenses] = await Promise.all([
      contactService.getContacts(this.getCurrentUser()?.uid || ""),
      sharedExpenseService.getAll(this.getCurrentUser()?.uid || ""),
    ]);

    this.contacts = contacts;
    this.sharedExpenses = sharedExpenses;

    console.log("Data loaded:", {
      contacts: contacts,
      sharedExpenses: sharedExpenses,
    });
  }

  private async loadCurredSharedExpenseDetails() {
    const currentExpenseId = this.getCurrentSharedExpenseId();
    const sharedExpense = this.getSharedExpense(currentExpenseId!);

    const [participants, expenses, payments] = await Promise.all([
      participantService.getParticipants(
        currentExpenseId || "",
        sharedExpense?.createdBy || ""
      ),
      expenseService.getExpenses(
        currentExpenseId || "",
        sharedExpense?.createdBy || ""
      ),
      paymentService.getPayments(
        currentExpenseId || "",
        sharedExpense?.createdBy || ""
      ),
    ]);

    this.expenses = expenses;
    this.payments = payments;
    this.participants = participants;

    console.log("Shared Expense details loaded:", {
      expenses: expenses,
      payments: payments,
      participants: participants,
    });
  }

  private currentUser: User | null = null;

  // Getter para usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async setCurrentUser(user: User | null): Promise<void> {
    this.currentUser = user;
    if (user) {
      // Procesar invitaciones pendientes
      await this.processPendingInvitations(user.email);
    }
  }

  // Login
  async signInWithGoogle(): Promise<void> {
    const user = await signInWithGoogle();
    await userService.createOrUpdateUser(user);
    this.currentUser = user;

    // Verificar invitaciones pendientes
    await this.processPendingInvitations(user.email);
  }

  // Logout
  async signOut(): Promise<void> {
    await signOut();
    this.currentUser = null;
    this.state.setCurrentView("login", this);
  }

  // Procesar invitaciones pendientes
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

  // Obtener usuarios por UIDs (actualizado)
  async getUsersByIds(uids: string[]): Promise<User[]> {
    return await userService.getUsersByIds(uids);
  }
}
