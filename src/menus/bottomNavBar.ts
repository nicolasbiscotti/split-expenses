import type { SharedExpense, ViewType } from "../types";

export default function bottomNavBar(
  currentView: ViewType,
  currentSharedExpense: SharedExpense | null | undefined
) {
  return `
          <nav class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div class="max-w-lg mx-auto flex justify-around py-3">
              
              <button onclick="setView('dashboard')" class="flex flex-col items-center ${
                currentView === "dashboard" ? "text-blue-600" : "text-gray-600"
              }">
                <span class="text-2xl">📊</span>
                <span class="text-xs">Dashboard</span>
              </button>
              
              <button onclick="setView('add-expense')" class="flex flex-col items-center ${
                currentView === "add-expense"
                  ? "text-blue-600"
                  : "text-gray-600"
              }" ${currentSharedExpense?.status === "closed" ? "disabled" : ""}>
                <span class="text-2xl">➕</span>
                <span class="text-xs">Gasto</span>
              </button>

              <button onclick="setView('add-payment')" class="flex flex-col items-center ${
                currentView === "add-payment"
                  ? "text-blue-600"
                  : "text-gray-600"
              }" ${currentSharedExpense?.status === "closed" ? "disabled" : ""}>
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
