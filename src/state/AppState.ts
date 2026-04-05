import type { ViewType, StepValue, SharedExpenseParticipant } from "../types";
import type AppStore from "../store";

export interface NewSharedExpenseData {
  name: string;
  description: string;
  type: "unique" | "recurring";
  participants: SharedExpenseParticipant[];
}

type RenderFunction = (state: AppState, store: AppStore) => void;

export default class AppState {
  private currentView: ViewType = "shared-expense-list";
  private createStep: StepValue = 1;
  private newSharedExpenseData: NewSharedExpenseData = {
    name: "",
    description: "",
    type: "unique",
    participants: [],
  };
  private renderFunctions: RenderFunction[] = [];

  // ==================== VIEW MANAGEMENT ====================
  getCurrentView(): ViewType {
    return this.currentView;
  }

  setCurrentView(view: ViewType, store: AppStore): void {
    if (view === "shared-expense-list") {
      store.clearCurrentSharedExpense();
    }
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
    return {
      ...this.newSharedExpenseData,
      participants: [...this.newSharedExpenseData.participants],
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

  // Toggle a participant in/out of the new shared expense (matched by email)
  toggleParticipantInNew(
    participant: SharedExpenseParticipant,
    store: AppStore
  ): void {
    const index = this.newSharedExpenseData.participants.findIndex(
      (p) => p.email === participant.email
    );
    if (index === -1) {
      this.newSharedExpenseData.participants.push(participant);
    } else {
      this.newSharedExpenseData.participants.splice(index, 1);
    }
    this.notify(store);
  }

  // Add a participant without toggling (used for add-by-email in step 2)
  addParticipantToNew(
    participant: SharedExpenseParticipant,
    store: AppStore
  ): void {
    const alreadyAdded = this.newSharedExpenseData.participants.some(
      (p) => p.email === participant.email
    );
    if (!alreadyAdded) {
      this.newSharedExpenseData.participants.push(participant);
      this.notify(store);
    }
  }

  resetNewSharedExpenseData(): void {
    this.newSharedExpenseData = {
      name: "",
      description: "",
      type: "unique",
      participants: [],
    };
    this.createStep = 1;
  }

  // ==================== VALIDATIONS ====================
  canProceedToStep2(): boolean {
    return this.newSharedExpenseData.name.trim().length > 0;
  }

  // Requires at least 2 participants (creator is auto-included as first entry)
  canProceedToStep3(): boolean {
    return this.newSharedExpenseData.participants.length >= 2;
  }

  isNewSharedExpenseValid(): boolean {
    return this.canProceedToStep2() && this.canProceedToStep3();
  }

  // ==================== NAVIGATION HELPERS ====================
  startCreateFlow(store: AppStore): void {
    this.resetNewSharedExpenseData();
    // Auto-include the current user as first participant
    const currentUser = store.getCurrentUser();
    if (currentUser) {
      this.newSharedExpenseData.participants.push({
        email: currentUser.email,
        displayName: currentUser.displayName,
        uid: currentUser.uid,
      });
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

  goToProfile(store: AppStore): void {
    this.setCurrentView("profile", store);
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

  notify(store: AppStore): void {
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
