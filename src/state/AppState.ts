// export type ViewType =
//   | "shared-expense-list"
//   | "create-step-1"
//   | "create-step-2"
//   | "create-step-3"
//   | "dashboard"
//   | "add-expense"
//   | "add-payment"
//   | "history";
// export type StepValue = 1 | 2 | 3;

import AppStore from "../store";
import type { StepValue, ViewType } from "../types";

export interface NewSharedExpenseData {
  name: string;
  description: string;
  type: "unique" | "recurring";
  participantIds: string[];
}

type StateListener = (state: AppState, store: AppStore) => void;

export default class AppState {
  private currentView: ViewType = "shared-expense-list";
  private createStep: StepValue = 1;
  private newSharedExpenseData: NewSharedExpenseData = {
    name: "",
    description: "",
    type: "unique",
    participantIds: [],
  };
  private renderList: StateListener[] = [];

  // Current View
  getCurrentView(): ViewType {
    return this.currentView;
  }

  setCurrentView(view: ViewType, store: AppStore): void {
    this.currentView = view;
    this.notifyRender(this, store);
  }

  // Create Steps
  getCreateStep(): StepValue {
    return this.createStep;
  }

  setCreateStep(step: StepValue, store: AppStore): void {
    this.createStep = step;
    this.currentView = `create-step-${step}` as ViewType;
    this.notifyRender(this, store);
  }

  goToNextStep(store: AppStore): void {
    if (this.createStep < 3) {
      this.setCreateStep((this.createStep + 1) as StepValue, store);
    }
  }

  goToPreviousStep(store: AppStore): void {
    if (this.createStep > 1) {
      this.setCreateStep((this.createStep - 1) as StepValue, store);
    }
  }

  // New Shared Expense Data
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
    // this.notifyRender();
  }

  setNewSharedExpenseDescription(description: string): void {
    this.newSharedExpenseData.description = description;
    // this.notifyRender();
  }

  setNewSharedExpenseType(type: "unique" | "recurring"): void {
    this.newSharedExpenseData.type = type;
    // this.notifyRender();
  }

  addParticipantToNew(userId: string): void {
    if (!this.newSharedExpenseData.participantIds.includes(userId)) {
      this.newSharedExpenseData.participantIds.push(userId);
      // this.notifyRender();
    }
  }

  removeParticipantFromNew(userId: string): void {
    this.newSharedExpenseData.participantIds =
      this.newSharedExpenseData.participantIds.filter((id) => id !== userId);
    // this.notifyRender();
  }

  toggleParticipantInNew(userId: string): void {
    const index = this.newSharedExpenseData.participantIds.indexOf(userId);
    if (index === -1) {
      this.addParticipantToNew(userId);
    } else {
      this.removeParticipantFromNew(userId);
    }
  }

  resetNewSharedExpenseData(store: AppStore): void {
    this.newSharedExpenseData = {
      name: "",
      description: "",
      type: "unique",
      participantIds: [],
    };
    this.createStep = 1;
    this.notifyRender(this, store);
  }

  // Validation
  canProceedToStep2(): boolean {
    return this.newSharedExpenseData.name.trim().length > 0;
  }

  canProceedToStep3(): boolean {
    return this.newSharedExpenseData.participantIds.length >= 2;
  }

  isNewSharedExpenseValid(): boolean {
    return this.canProceedToStep2() && this.canProceedToStep3();
  }

  // Navigation Helpers
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

  startCreateFlow(store: AppStore): void {
    this.resetNewSharedExpenseData(store);
    this.setCurrentView("create-step-1", store);
  }

  // Observers
  subscribeRender(listener: StateListener): () => void {
    this.renderList.push(listener);

    // return the unsubscribe function
    return () => {
      this.renderList = this.renderList.filter((l) => l !== listener);
    };
  }

  private notifyRender(state: AppState, store: AppStore) {
    this.renderList.forEach((render: StateListener) => render(state, store));
  }

  // Debug
  getState() {
    return {
      currentView: this.currentView,
      createStep: this.createStep,
      newSharedExpenseData: this.newSharedExpenseData,
    };
  }

  setState(config?: {
    rerender?: boolean;
    store?: AppStore;
    view?: ViewType;
    step?: StepValue;
  }) {
    this.currentView = config?.view || this.currentView;
    this.createStep = config?.step || this.createStep;
    // this.newSharedExpenseData = state.getNewSharedExpenseData();

    if (config?.rerender && config.store) {
      this.notifyRender(this, config.store);
    }
  }
}

// export const state = new AppState();
