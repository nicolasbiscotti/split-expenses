import type { SharedExpense } from "../../types";

/**
 * Render: Top bar showing the active shared expense name and a back-to-list button
 */
export default function sharedExpenseTopBar(
  currentSharedExpense: SharedExpense | null | undefined
): string {
  const name = currentSharedExpense?.name ?? "";

  return `
    <header class="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-10">
      <div class="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
        <button
          onclick="setView('shared-expense-list')"
          class="text-blue-600 flex items-center gap-1 shrink-0"
          aria-label="Volver a Mis Gastos"
        >
          ← Mis Gastos
        </button>
        <span class="text-gray-300">|</span>
        <h1 class="font-semibold text-gray-800 truncate">${name}</h1>
      </div>
    </header>
  `;
}
