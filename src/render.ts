import type AppStore from "./store";
import type AppState from "./state/AppState";
import { renderIcons } from "./util/icons";

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
import { setupExpenseList } from "./components/history/expenseList";
import { setupPaymentList } from "./components/history/paymentList";

// Navigation
import bottomNavBar from "./components/menus/bottomNavBar";
import sharedExpenseTopBar from "./components/menus/sharedExpenseTopBar";

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

// Landing (unauthenticated)
import renderLanding, { setupLanding } from "./components/landing/landing";

// Profile
import renderProfile, { setupProfile } from "./components/profile/profile";

// Invite detail
import renderInviteDetail, {
  setupInviteDetail,
} from "./components/inviteDetail/inviteDetail";

/**
 * Main render function.
 * Called on every state or store change.
 */
export default function render(state: AppState, store: AppStore): void {
  const app = document.getElementById("app");
  if (!app) return;

  // Auth gate: show landing if user is not signed in
  if (!store.getCurrentUser()) {
    app.innerHTML = renderLanding(state, store);
    renderIcons();
    setupLanding(app, store);
    return;
  }

  const currentId = store.getCurrentSharedExpenseId();
  const currentSharedExpense = currentId
    ? store.getSharedExpense(currentId)
    : null;
  const currentView = state.getCurrentView();
  const currentUser = store.getCurrentUser()!;

  // Determine padding needs based on fixed bars
  const needsBottomNav =
    currentView !== "shared-expense-list" &&
    currentView !== "profile" &&
    !currentView.startsWith("create");
  const needsTopBar = needsBottomNav;

  // Render HTML
  app.innerHTML = `
    ${needsTopBar ? sharedExpenseTopBar(currentSharedExpense, currentUser) : ""}

    <div id="view-content" class="max-w-lg mx-auto ${needsBottomNav ? "p-4 pt-16 pb-20" : "p-4"}">
      ${renderViewContent(currentView, state, store)}
    </div>

    ${needsBottomNav ? bottomNavBar(state, currentSharedExpense, store.getUnreadCount()) : ""}
  `;

  renderIcons();

  // Run setup functions after render
  setupViewInteractions(currentView, state, store);
}

/**
 * Renders the HTML content for the current view.
 */
function renderViewContent(
  view: string,
  state: AppState,
  store: AppStore
): string {
  switch (view) {
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

    case "invite-detail":
      return renderInviteDetail(state, store);

    case "profile":
      return renderProfile(state, store);

    default:
      return '<div class="text-center p-8">Vista no encontrada</div>';
  }
}

/**
 * Calls the setup() function for the current view to attach event listeners.
 */
function setupViewInteractions(
  view: string,
  state: AppState,
  store: AppStore
): void {
  const app = document.getElementById("app");
  if (!app) return;

  switch (view) {
    case "shared-expense-list": {
      const container = app.querySelector<HTMLElement>("#view-content");
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
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupCreateStep2(container, state, store);
      }
      break;
    }

    case "create-step-3": {
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupCreateStep3(container, state, store);
      }
      break;
    }

    case "dashboard": {
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupDashboard(container, state, store);
      }
      break;
    }

    case "add-expense": {
      const form = app.querySelector<HTMLFormElement>("#expense-form");
      if (form) setupExpenseForm(form, state, store);
      const expContainer = app.querySelector<HTMLElement>("#view-content");
      if (expContainer) setupExpenseList(expContainer, store);
      break;
    }

    case "add-payment": {
      const form = app.querySelector<HTMLFormElement>("#payment-form");
      if (form) setupPaymentForm(form, state, store);
      const payContainer = app.querySelector<HTMLElement>("#view-content");
      if (payContainer) setupPaymentList(payContainer, store);
      break;
    }

    case "history": {
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupHistory(container, state, store);
      }
      break;
    }

    case "invite-detail": {
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupInviteDetail(container, state, store);
      }
      break;
    }

    case "profile": {
      const container = app.querySelector<HTMLElement>("#view-content");
      if (container) {
        setupProfile(container, state, store);
      }
      break;
    }

    default:
      break;
  }
}
