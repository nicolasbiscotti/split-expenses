import type { ViewType, StepValue, ResolvedContact } from "../types";
import type AppStore from "../store";

/**
 * Data structure for creating a new shared expense
 * Now uses ResolvedContact instead of Participant
 */
export interface NewSharedExpenseData {
  name: string;
  description: string;
  type: "unique" | "recurring";

  // Selected contacts (Global Contact IDs)
  selectedContactIds: string[];

  // Resolved contacts for display
  selectedContacts: ResolvedContact[];

  // Which contacts are admins (subset of selectedContactIds)
  adminContactIds: string[];
}

type RenderFunction = (state: AppState, store: AppStore) => void;

export default class AppState {
  private currentView: ViewType = "shared-expense-list";
  private createStep: StepValue = 1;
  private newSharedExpenseData: NewSharedExpenseData = {
    name: "",
    description: "",
    type: "unique",
    selectedContactIds: [],
    selectedContacts: [],
    adminContactIds: [],
  };
  private renderFunctions: RenderFunction[] = [];

  // ==================== VIEW MANAGEMENT ====================
  getCurrentView(): ViewType {
    return this.currentView;
  }

  setCurrentView(view: ViewType, store: AppStore): void {
    this.currentView = view;
    this.notify(store);
  }

  // ==================== CREATE STEPS ====================
  getCreateStep(): StepValue {
    return this.createStep;
  }

  setCreateStep(step: StepValue): void {
    this.createStep = step;
  }

  goToNextStep(store: AppStore): void {
    if (this.createStep < 3) {
      this.createStep = (this.createStep + 1) as StepValue;
      this.currentView = `create-step-${this.createStep}` as ViewType;
      this.notify(store);
    }
  }

  goToPreviousStep(store: AppStore): void {
    if (this.createStep > 1) {
      this.createStep = (this.createStep - 1) as StepValue;
      this.currentView = `create-step-${this.createStep}` as ViewType;
      this.notify(store);
    }
  }

  // ==================== NEW SHARED EXPENSE DATA ====================
  getNewSharedExpenseData(): NewSharedExpenseData {
    return { ...this.newSharedExpenseData };
  }

  updateNewSharedExpenseData(updates: Partial<NewSharedExpenseData>): void {
    this.newSharedExpenseData = {
      ...this.newSharedExpenseData,
      ...updates,
    };
  }

  setNewSharedExpenseName(name: string): void {
    this.newSharedExpenseData.name = name;
  }

  setNewSharedExpenseDescription(description: string): void {
    this.newSharedExpenseData.description = description;
  }

  setNewSharedExpenseType(type: "unique" | "recurring"): void {
    this.newSharedExpenseData.type = type;
  }

  /**
   * Toggle a contact's selection for the new shared expense
   */
  toggleContactSelection(contact: ResolvedContact, store: AppStore): void {
    const index = this.newSharedExpenseData.selectedContactIds.indexOf(
      contact.id
    );

    if (index === -1) {
      // Add contact
      this.newSharedExpenseData.selectedContactIds.push(contact.id);
      this.newSharedExpenseData.selectedContacts.push(contact);

      // If this is the current user, make them admin by default
      const currentUser = store.getCurrentUser();
      if (currentUser && contact.appUserId === currentUser.uid) {
        if (!this.newSharedExpenseData.adminContactIds.includes(contact.id)) {
          this.newSharedExpenseData.adminContactIds.push(contact.id);
        }
      }
    } else {
      // Remove contact
      this.newSharedExpenseData.selectedContactIds.splice(index, 1);
      this.newSharedExpenseData.selectedContacts =
        this.newSharedExpenseData.selectedContacts.filter(
          (c) => c.id !== contact.id
        );

      // Also remove from admins if present
      const adminIndex = this.newSharedExpenseData.adminContactIds.indexOf(
        contact.id
      );
      if (adminIndex !== -1) {
        this.newSharedExpenseData.adminContactIds.splice(adminIndex, 1);
      }
    }

    this.notify(store);
  }

  /**
   * Add a newly created contact to the selection
   */
  addNewContactToSelection(contact: ResolvedContact, store: AppStore): void {
    if (!this.newSharedExpenseData.selectedContactIds.includes(contact.id)) {
      this.newSharedExpenseData.selectedContactIds.push(contact.id);
      this.newSharedExpenseData.selectedContacts.push(contact);
    }
    this.notify(store);
  }

  /**
   * Toggle admin status for a selected contact
   */
  toggleAdminStatus(contactId: string, store: AppStore): void {
    const index = this.newSharedExpenseData.adminContactIds.indexOf(contactId);

    if (index === -1) {
      this.newSharedExpenseData.adminContactIds.push(contactId);
    } else {
      this.newSharedExpenseData.adminContactIds.splice(index, 1);
    }

    this.notify(store);
  }

  /**
   * Check if a contact is selected
   */
  isContactSelected(contactId: string): boolean {
    return this.newSharedExpenseData.selectedContactIds.includes(contactId);
  }

  /**
   * Check if a contact is an admin
   */
  isContactAdmin(contactId: string): boolean {
    return this.newSharedExpenseData.adminContactIds.includes(contactId);
  }

  resetNewSharedExpenseData(): void {
    this.newSharedExpenseData = {
      name: "",
      description: "",
      type: "unique",
      selectedContactIds: [],
      selectedContacts: [],
      adminContactIds: [],
    };
    this.createStep = 1;
  }

  // ==================== VALIDATIONS ====================
  canProceedToStep2(): boolean {
    return this.newSharedExpenseData.name.trim().length > 0;
  }

  canProceedToStep3(): boolean {
    return this.newSharedExpenseData.selectedContactIds.length >= 2;
  }

  isNewSharedExpenseValid(): boolean {
    return (
      this.canProceedToStep2() &&
      this.canProceedToStep3() &&
      this.newSharedExpenseData.adminContactIds.length >= 1
    );
  }

  // ==================== NAVIGATION HELPERS ====================
  startCreateFlow(store: AppStore): void {
    this.resetNewSharedExpenseData();

    // Auto-select current user as participant and admin
    const currentUserContact = store.getCurrentUserContact();
    if (currentUserContact) {
      this.newSharedExpenseData.selectedContactIds.push(currentUserContact.id);
      this.newSharedExpenseData.selectedContacts.push(currentUserContact);
      this.newSharedExpenseData.adminContactIds.push(currentUserContact.id);
    }

    this.setCurrentView("create-step-1", store);
  }

  goToList(store: AppStore): void {
    this.setCurrentView("shared-expense-list", store);
  }

  goToDashboard(store: AppStore): void {
    this.setCurrentView("dashboard", store);
  }

  goToAddExpense(store: AppStore): void {
    this.setCurrentView("add-expense", store);
  }

  goToAddPayment(store: AppStore): void {
    this.setCurrentView("add-payment", store);
  }

  goToHistory(store: AppStore): void {
    this.setCurrentView("history", store);
  }

  // ==================== OBSERVER PATTERN ====================
  subscribeRender(renderFn: RenderFunction): () => void {
    this.renderFunctions.push(renderFn);
    return () => {
      this.renderFunctions = this.renderFunctions.filter(
        (fn) => fn !== renderFn
      );
    };
  }

  private notify(store: AppStore): void {
    this.renderFunctions.forEach((renderFn) => renderFn(this, store));
  }

  // ==================== DEBUG ====================
  getState() {
    return {
      currentView: this.currentView,
      createStep: this.createStep,
      newSharedExpenseData: this.newSharedExpenseData,
    };
  }
}
