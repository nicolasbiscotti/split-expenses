import type AppStore from "./store";
import renderDashboard from "./dashboard/dashboard";
import renderExpenseForm from "./expenseForm/expenseForm";
import renderPaymentForm from "./paymentForm/paymentForm";
import renderHistory from "./history/history";

export default function render(currentView: string, store: AppStore) {
  const app = document.getElementById("app")!;
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

        <nav class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div class="max-w-lg mx-auto flex justify-around py-3">
            <button onclick="setView('dashboard')" class="flex flex-col items-center ${
              currentView === "dashboard" ? "text-blue-600" : "text-gray-600"
            }">
              <span class="text-2xl">📊</span>
              <span class="text-xs">Dashboard</span>
            </button>
            <button onclick="setView('add-expense')" class="flex flex-col items-center ${
              currentView === "add-expense" ? "text-blue-600" : "text-gray-600"
            }">
              <span class="text-2xl">➕</span>
              <span class="text-xs">Gasto</span>
            </button>
            <button onclick="setView('add-payment')" class="flex flex-col items-center ${
              currentView === "add-payment" ? "text-blue-600" : "text-gray-600"
            }">
              <span class="text-2xl">💸</span>
              <span class="text-xs">Pago</span>
            </button>
            <button onclick="setView('history')" class="flex flex-col items-center ${
              currentView === "history" ? "text-blue-600" : "text-gray-600"
            }">
              <span class="text-2xl">📜</span>
              <span class="text-xs">Historial</span>
            </button>
          </div>
        </nav>
      `;
}
