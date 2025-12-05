import type AppStore from "./store";
import renderDashboard from "./dashboard/dashboard";
import renderExpenseForm from "./expenseForm/expenseForm";
import renderPaymentForm from "./paymentForm/paymentForm";
import renderHistory from "./history/history";
import bottomNavBar from "./menus/bottomNavBar";
import renderSharedExpenseList from "./components/sharedExpenseList/sharedExpenseList";
import renderCreateStep1, {
  setupStep1,
} from "./components/createSteps/createStep1";
import renderCreateStep2 from "./components/createSteps/createStep2";
import renderCreateStep3 from "./components/createSteps/createStep3";
import type AppState from "./state/AppState";

export default function render(state: AppState, store: AppStore) {
  const app = document.getElementById("app")!;
  const currentId = store.getCurrentSharedExpenseId();
  const currentSharedExpense = currentId
    ? store.getSharedExpense(currentId)
    : null;

  app.innerHTML = `
    <div class="max-w-lg mx-auto ${
      state.getCurrentView() === "shared-expense-list" ||
      state.getCurrentView().startsWith("create")
        ? "p-4"
        : "p-4 pb-20"
    }">
      ${
        state.getCurrentView() === "shared-expense-list"
          ? renderSharedExpenseList(store)
          : ""
      }
      ${
        state.getCurrentView() === "create-step-1"
          ? renderCreateStep1(state)
          : ""
      }
      ${
        state.getCurrentView() === "create-step-2"
          ? renderCreateStep2(state, store)
          : ""
      }
      ${
        state.getCurrentView() === "create-step-3"
          ? renderCreateStep3(state, store)
          : ""
      }
      ${state.getCurrentView() === "dashboard" ? renderDashboard(store) : ""}
      ${
        state.getCurrentView() === "add-expense" ? renderExpenseForm(store) : ""
      }
      ${
        state.getCurrentView() === "add-payment" ? renderPaymentForm(store) : ""
      }
      ${state.getCurrentView() === "history" ? renderHistory(store) : ""}
    </div>

    ${
      state.getCurrentView() !== "shared-expense-list" &&
      !state.getCurrentView().startsWith("create")
        ? bottomNavBar(state, currentSharedExpense)
        : ""
    }
  `;

  if (state.getCurrentView() === "create-step-1") {
    setupStep1(
      document.querySelector<HTMLFormElement>("#create-step-1-form")!,
      state,
      store
    );
  }
}
