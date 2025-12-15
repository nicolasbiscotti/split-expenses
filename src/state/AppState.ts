import type { ViewType, StepValue, Participant } from "../types";
import type AppStore from "../store";

export interface NewSharedExpenseData {
  name: string;
  description: string;
  type: "unique" | "recurring";
  participantIds: string[];
  participants: Participant[];
}

type RenderFunction = (state: AppState, store: AppStore) => void;

export default class AppState {
  private currentView: ViewType = "shared-expense-list";
  private createStep: StepValue = 1;
  private newSharedExpenseData: NewSharedExpenseData = {
    name: "",
    description: "",
    type: "unique",
    participantIds: [],
    participants: [],
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
    // NO notificamos aquí para evitar re-renders innecesarios en cada tecla
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

  toggleParticipantInNew(contactId: string, store: AppStore): void {
    const index = this.newSharedExpenseData.participantIds.indexOf(contactId);
    if (index === -1) {
      this.newSharedExpenseData.participantIds.push(contactId);
      this.newSharedExpenseData.participants = store
        .getContacts()
        .filter((c) => this.newSharedExpenseData.participantIds.includes(c.id))
        .map((c) => ({
          id: "",
          name: c.name,
          isAdmin: store.getCurrentUser()?.uid === c.appUserId,
          contactId: c.id,
          email: c.email,
          appUserId: c.appUserId,
        }));
    } else {
      this.newSharedExpenseData.participantIds.splice(index, 1);
      this.newSharedExpenseData.participants = store
        .getContacts()
        .filter((c) => this.newSharedExpenseData.participantIds.includes(c.id))
        .map((c) => ({
          id: "",
          name: c.name,
          isAdmin: store.getCurrentUser()?.uid === c.appUserId,
          contactId: c.id,
          email: c.email,
          appUserId: c.appUserId,
        }));
    }

    console.log("new Shared Expense Data ==> ", this.newSharedExpenseData);

    this.notify(store); // Notificamos porque cambia la UI
  }

  resetNewSharedExpenseData(): void {
    this.newSharedExpenseData = {
      name: "",
      description: "",
      type: "unique",
      participantIds: [],
      participants: [],
    };
    this.createStep = 1;
  }

  // ==================== VALIDATIONS ====================
  canProceedToStep2(): boolean {
    return this.newSharedExpenseData.name.trim().length > 0;
  }

  canProceedToStep3(): boolean {
    return this.newSharedExpenseData.participantIds.length >= 2;
  }

  isNewSharedExpenseValid(): boolean {
    return this.canProceedToStep2() && this.canProceedToStep3();
  }

  // ==================== NAVIGATION HELPERS ====================
  startCreateFlow(store: AppStore): void {
    this.resetNewSharedExpenseData();
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
