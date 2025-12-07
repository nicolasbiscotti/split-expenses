import type AppState from "../../state/AppState";
import type { SharedExpense } from "../../types";

/**
 * Render: Navegación inferior fija
 * Este componente usa onclick global (window.setView) definido en main.ts
 * No necesita setup porque los eventos se manejan globalmente
 */
export default function bottomNavBar(
  state: AppState,
  currentSharedExpense: SharedExpense | null | undefined
): string {
  const currentView = state.getCurrentView();
  const isClosed = currentSharedExpense?.status === "closed";

  return `
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div class="max-w-lg mx-auto flex justify-around py-3">
        
        <button 
          onclick="setView('dashboard')" 
          class="flex flex-col items-center ${
            currentView === "dashboard" ? "text-blue-600" : "text-gray-600"
          }"
        >
          <span class="text-2xl">📊</span>
          <span class="text-xs">Dashboard</span>
        </button>
        
        <button 
          onclick="setView('add-expense')" 
          class="flex flex-col items-center ${
            currentView === "add-expense" ? "text-blue-600" : "text-gray-600"
          }" 
          ${isClosed ? "disabled" : ""}
        >
          <span class="text-2xl ${isClosed ? "opacity-50" : ""}">➕</span>
          <span class="text-xs ${isClosed ? "opacity-50" : ""}">Gasto</span>
        </button>

        <button 
          onclick="setView('add-payment')" 
          class="flex flex-col items-center ${
            currentView === "add-payment" ? "text-blue-600" : "text-gray-600"
          }" 
          ${isClosed ? "disabled" : ""}
        >
          <span class="text-2xl ${isClosed ? "opacity-50" : ""}">💸</span>
          <span class="text-xs ${isClosed ? "opacity-50" : ""}">Pago</span>
        </button>
        
        <button 
          onclick="setView('history')" 
          class="flex flex-col items-center ${
            currentView === "history" ? "text-blue-600" : "text-gray-600"
          }"
        >
          <span class="text-2xl">📜</span>
          <span class="text-xs">Historial</span>
        </button>
        
      </div>
    </nav>
  `;
}

/**
 * NOTA: Este componente no necesita setup porque:
 * - Usa onclick inline que llama a window.setView()
 * - window.setView está definido en main.ts
 * - Es más simple para navegación global
 *
 * Si prefieres usar event delegation, puedes crear:
 * export function setupBottomNavBar(nav, state, store) {...}
 */
