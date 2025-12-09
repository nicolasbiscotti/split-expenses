import type AppStore from "./store";
import type AppState from "./state/AppState";

import renderLoginScreen, {
  setupLoginScreen,
} from "./components/auth/LoginScreen";

// Dashboard
import renderDashboard, {
  setupDashboard,
} from "./components/dashboard/dashboard";

// Forms
import renderExpenseForm, {
  setupExpenseForm,
} from "./components/expenseForm/expenseForm";
import renderPaymentForm, {
  setupPaymentForm,
} from "./components/paymentForm/paymentForm";

// History
import renderHistory, { setupHistory } from "./components/history/history";

// Navigation
import bottomNavBar from "./components/menus/bottomNavBar";

// Shared Expense List
import renderSharedExpenseList, {
  setupSharedExpenseList,
} from "./components/sharedExpenseList/sharedExpenseList";

// Create Steps
import renderCreateStep1, {
  setupCreateStep1,
} from "./components/createSteps/createStep1";

import renderCreateStep2, {
  setupCreateStep2,
} from "./components/createSteps/createStep2";

import renderCreateStep3, {
  setupCreateStep3,
} from "./components/createSteps/createStep3";

/**
 * Función principal de renderizado
 * Se ejecuta cada vez que cambia el estado
 */
export default function render(state: AppState, store: AppStore): void {
  const app = document.getElementById("app");
  if (!app) return;

  const currentId = store.getCurrentSharedExpenseId();
  const currentSharedExpense = currentId
    ? store.getSharedExpense(currentId)
    : null;
  const currentView = state.getCurrentView();

  // Determinar si necesita padding bottom para la navegación
  const needsBottomPadding =
    currentView !== "shared-expense-list" && !currentView.startsWith("create");

  // Renderizar el HTML
  app.innerHTML = `
    <div class="max-w-lg mx-auto ${needsBottomPadding ? "p-4 pb-20" : "p-4"}">
      ${renderViewContent(currentView, state, store)}
    </div>

    ${needsBottomPadding ? bottomNavBar(state, currentSharedExpense) : ""}
  `;

  // Ejecutar setup functions después del render
  setupViewInteractions(currentView, state, store);
}

/**
 * Renderiza el contenido de la vista actual
 */
function renderViewContent(
  view: string,
  state: AppState,
  store: AppStore
): string {
  switch (view) {
    case "login":
      return renderLoginScreen();

    case "shared-expense-list":
      return renderSharedExpenseList(state, store);

    case "create-step-1":
      return renderCreateStep1(state);

    case "create-step-2":
      return renderCreateStep2(state, store);

    case "create-step-3":
      return renderCreateStep3(state, store);

    case "dashboard":
      return renderDashboard(state, store);

    case "add-expense":
      return renderExpenseForm(state, store);

    case "add-payment":
      return renderPaymentForm(state, store);

    case "history":
      return renderHistory(state, store);

    default:
      return '<div class="text-center p-8">Vista no encontrada</div>';
  }
}

/**
 * Configura las interacciones de la vista actual
 * Aquí es donde llamamos a los setup functions
 */
function setupViewInteractions(
  view: string,
  state: AppState,
  store: AppStore
): void {
  const app = document.getElementById("app");
  if (!app) return;

  switch (view) {
    case "login": {
      setupLoginScreen(app, state, store);
      break;
    }

    case "shared-expense-list": {
      const container = app.querySelector<HTMLElement>(".max-w-lg");
      if (container) {
        setupSharedExpenseList(container, state, store);
      }
      break;
    }

    case "create-step-1": {
      const form = app.querySelector<HTMLFormElement>("#create-step-1-form");
      if (form) {
        setupCreateStep1(form, state, store);
      }
      break;
    }

    case "create-step-2": {
      const container = app.querySelector<HTMLElement>(".max-w-lg");
      if (container) {
        setupCreateStep2(container, state, store);
      }
      break;
    }

    case "create-step-3": {
      const container = app.querySelector<HTMLElement>(".max-w-lg");
      if (container) {
        setupCreateStep3(container, state, store);
      }
      break;
    }

    case "dashboard": {
      const container = app.querySelector<HTMLElement>(".max-w-lg");
      if (container) {
        setupDashboard(container, state, store);
      }
      break;
    }

    case "add-expense": {
      const form = app.querySelector<HTMLFormElement>("#expense-form");
      if (form) {
        setupExpenseForm(form, state, store);
      }
      break;
    }

    case "add-payment": {
      const form = app.querySelector<HTMLFormElement>("#payment-form");
      if (form) {
        setupPaymentForm(form, state, store);
      }
      break;
    }

    case "history": {
      const container = app.querySelector<HTMLElement>(".max-w-lg");
      if (container) {
        setupHistory(container, state, store);
      }
      break;
    }

    default:
      // Vistas que no necesitan setup específico
      break;
  }
}
