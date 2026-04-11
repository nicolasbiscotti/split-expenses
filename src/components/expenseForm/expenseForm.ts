import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Expense } from "../../types";
import { showToast } from "../../util/toast";
import { renderExpenseList } from "../history/expenseList";
import { setupCurrencyInput } from "../../util/currencyInput";
import { icon } from "../../util/icons";

/**
 * Render: Expense form + expense list
 */
export default function renderExpenseForm(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const participants = store.getParticipantsForSharedExpense(currentId);
  const expenses = store.getExpenses();

  return `
    <div class="space-y-4">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">${icon("receipt", "w-5 h-5")} Agregar Gasto</h2>
      <form id="expense-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Quién pagó</label>
          <select name="paidByEmail" required class="w-full p-2 border rounded">
            <option value="">Selecciona...</option>
            ${participants
              .map(
                (p) => `
              <option value="${p.email}">${p.displayName !== p.email ? p.displayName : p.email}</option>
            `
              )
              .join("")}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Monto</label>
          <div class="relative">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">$</span>
            <input
              type="text"
              inputmode="decimal"
              name="amount"
              required
              class="w-full p-2 pl-6 border rounded"
              placeholder="0,00"
              autocomplete="off"
            >
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Descripción</label>
          <input
            type="text"
            name="description"
            required
            class="w-full p-2 border rounded"
            placeholder="Ej: Cena, Supermercado"
          >
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            class="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1"
          >
            ${icon("check", "w-4 h-4")} Guardar
          </button>
          <button
            type="button"
            id="cancel-expense"
            class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400 transition flex items-center justify-center gap-1"
          >
            ${icon("x", "w-4 h-4")} Cancelar
          </button>
        </div>
      </form>
    </div>
    ${renderExpenseList(expenses, store.getHasMoreExpenses(), participants)}
    </div>
  `;
}

/**
 * Setup: Handles the expense form submission
 */
export function setupExpenseForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const cancelButton = form.querySelector<HTMLButtonElement>("#cancel-expense");
  const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const amountInput = form.querySelector<HTMLInputElement>('[name="amount"]');
  const getAmount = amountInput ? setupCurrencyInput(amountInput) : () => NaN;

  cancelButton?.addEventListener("click", () => state.goToDashboard(store));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentSharedExpenseId = store.getCurrentSharedExpenseId();
    if (!currentSharedExpenseId) {
      showToast("No hay un gasto compartido seleccionado", "error");
      return;
    }

    const amount = getAmount();
    if (isNaN(amount) || amount <= 0) {
      showToast("Ingresa un monto válido", "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";
    }

    const formData = new FormData(form);
    try {
      await store.addExpense(
        {
          sharedExpenseId: currentSharedExpenseId,
          paidByEmail: formData.get("paidByEmail") as string,
          amount,
          description: formData.get("description") as string,
          date: new Date().toISOString(),
        } as Expense,
        "dashboard"
      );
      showToast("Gasto guardado");
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Guardar";
      }
      const message = (error as { code?: string }).code === "permission-denied"
        ? "No tienes permiso para agregar este gasto"
        : "Error al agregar el gasto";
      showToast(message, "error");
    }
  });
}
