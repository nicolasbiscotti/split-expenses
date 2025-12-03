import type AppStore from "./store";
import renderDashboard from "./dashboard/dashboard";
import renderExpenseForm from "./expenseForm/expenseForm";
import renderPaymentForm from "./paymentForm/paymentForm";
import renderHistory from "./history/history";
import type { ViewType } from "./types";
import bottomNavBar from "./manus/bottomNavBar";

export default function render(currentView: ViewType, store: AppStore) {
  const app = document.getElementById("app")!;
  const currentId = store.getCurrentSharedExpenseId();
  const currentSharedExpense = currentId
    ? store.getSharedExpense(currentId)
    : null;

  app.innerHTML = `
        <div class="max-w-lg mx-auto p-4 pb-20">
          <header class="mb-6">
            <h1 class="text-3xl font-bold text-gray-800">💰 Split Expenses</h1>
            <p class="text-gray-600">Gestiona gastos compartidos</p>
          </header>

          ${currentView === "dashboard" ? renderDashboard(store) : ""}
          ${currentView === "add-expense" ? renderExpenseForm(store) : ""}
          ${currentView === "add-payment" ? renderPaymentForm(store) : ""}
          ${currentView === "history" ? renderHistory(store) : ""}
        </div>

        ${
          currentView !== "shared-expense-list" &&
          !currentView.startsWith("create")
            ? bottomNavBar(currentView, currentSharedExpense)
            : ""
        }
      `;
}
