import type { NewSharedExpenseData } from "../state/AppState";
import type { StepValue, ViewType } from "../types";

export interface CreateSharedExpenseEvent {
  currentView: ViewType;
  createStep: StepValue;
  newSharedExpenseData: NewSharedExpenseData;
}

export default function dispatchCreateSharedExpenseEvent(): void {
  const event = new CustomEvent<CreateSharedExpenseEvent>(
    "createsharedexpense",
    {
      detail: {
        currentView: "create-step-1",
        createStep: 1,
        newSharedExpenseData: {
          name: "",
          description: "",
          type: "unique",
          selectedContactIds: [],
          selectedContacts: [],
          adminContactIds: [],
        },
      },
      bubbles: true,
    }
  );

  document.dispatchEvent(event);
  console.log("Event 'createsharedexpense' dispatched ==> ");
}
