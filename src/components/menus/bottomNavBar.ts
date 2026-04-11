import type AppState from "../../state/AppState";
import type { SharedExpense } from "../../types";
import { icon } from "../../util/icons";

/**
 * Render: Navegación inferior fija
 * Este componente usa onclick global (window.setView) definido en main.ts
 * No necesita setup porque los eventos se manejan globalmente
 */
export default function bottomNavBar(
  state: AppState,
  currentSharedExpense: SharedExpense | null | undefined,
  unreadCount: number = 0
): string {
  const currentView = state.getCurrentView();
  const isClosed = currentSharedExpense?.status === "closed";

  return `
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div class="max-w-lg mx-auto flex justify-around py-3">
        
        <button
          onclick="setView('dashboard')"
          class="flex flex-col items-center gap-1 ${
            currentView === "dashboard" ? "text-blue-600" : "text-gray-600"
          }"
        >
          ${icon("layout-dashboard", "w-6 h-6")}
          <span class="text-xs">Dashboard</span>
        </button>

        <button
          onclick="setView('add-expense')"
          class="flex flex-col items-center gap-1 ${
            currentView === "add-expense" ? "text-blue-600" : "text-gray-600"
          } ${isClosed ? "opacity-40" : ""}"
          ${isClosed ? "disabled" : ""}
        >
          ${icon("plus-square", "w-6 h-6")}
          <span class="text-xs">Gasto</span>
        </button>

        <button
          onclick="setView('add-payment')"
          class="flex flex-col items-center gap-1 ${
            currentView === "add-payment" ? "text-blue-600" : "text-gray-600"
          } ${isClosed ? "opacity-40" : ""}"
          ${isClosed ? "disabled" : ""}
        >
          ${icon("arrow-right-left", "w-6 h-6")}
          <span class="text-xs">Pago</span>
        </button>

        <button
          onclick="setView('history')"
          class="flex flex-col items-center gap-1 ${
            currentView === "history" ? "text-blue-600" : "text-gray-600"
          }"
        >
          <span class="relative inline-block">
            ${icon("clock", "w-6 h-6")}
            ${unreadCount > 0
              ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">
                   ${unreadCount > 9 ? "9+" : unreadCount}
                 </span>`
              : ""}
          </span>
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
