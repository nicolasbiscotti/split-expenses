import type AppStore from "../../store";
import type { Expense, SharedExpenseParticipant } from "../../types";
import { formatCurrency, formatDate } from "../../util/format";
import { showToast } from "../../util/toast";
import { icon, renderIcons } from "../../util/icons";

/**
 * Render: Single expense item
 */
export function renderExpenseItem(expense: Expense, participants: SharedExpenseParticipant[]): string {
  const payer = participants.find((p) => p.email === expense.paidByEmail);
  const payerName = payer
    ? (payer.displayName !== payer.email ? payer.displayName : payer.email)
    : expense.paidByEmail ?? "Desconocido";

  return `
    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
      <div>
        <p class="font-medium">${expense.description}</p>
        <p class="text-sm text-gray-600">
          ${payerName} · ${formatDate(expense.date)}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold">${formatCurrency(expense.amount)}</span>
        <button
          class="delete-expense-btn text-red-600 hover:text-red-800"
          data-expense-id="${expense.id}"
          title="Eliminar gasto"
        >
          ${icon("trash-2", "w-4 h-4")}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render: Expenses section card with title, list, and optional load-more button
 */
export function renderExpenseList(expenses: Expense[], hasMore: boolean, participants: SharedExpenseParticipant[]): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">${icon("receipt", "w-5 h-5")} Gastos</h2>
      ${
        expenses.length === 0
          ? '<p class="text-gray-500">No hay gastos registrados</p>'
          : `
          <div class="space-y-2">
            ${expenses.map((expense) => renderExpenseItem(expense, participants)).join("")}
          </div>
          ${hasMore ? `<button id="load-more-expenses" class="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1">Cargar más gastos ${icon("chevron-down", "w-4 h-4")}</button>` : ""}
        `
      }
    </div>
  `;
}

/**
 * Setup: Attaches delete and load-more handlers for the expense list
 */
export function setupExpenseList(container: HTMLElement, store: AppStore): void {
  container.querySelector("#load-more-expenses")?.addEventListener("click", () => {
    store.loadMoreExpenses();
  });

  // Use closest() to handle clicks on child nodes of the button (e.g. emoji text)
  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".delete-expense-btn");
    if (!btn) return;

    const expenseId = btn.dataset.expenseId;
    if (!expenseId) return;

    if (confirm("¿Eliminar este gasto?")) {
      btn.disabled = true;
      btn.innerHTML = icon("loader-2", "w-4 h-4 animate-spin");
      renderIcons();
      store.deleteExpense(expenseId, "history").catch((error) => {
        btn.disabled = false;
        btn.innerHTML = icon("trash-2", "w-4 h-4");
        renderIcons();
        const message = (error as { code?: string }).code === "permission-denied"
          ? "No tienes permiso para eliminar este gasto"
          : "Error al eliminar el gasto";
        showToast(message, "error");
      });
    }
  });
}
