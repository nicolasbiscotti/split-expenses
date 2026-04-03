import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Expense } from "../../types";
import { showToast } from "../../util/toast";

/**
 * Render: Expense form
 */
export default function renderExpenseForm(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const participants = store.getParticipantsForSharedExpense(currentId);

  return `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Agregar Gasto</h2>
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
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            required
            class="w-full p-2 border rounded"
            placeholder="0.00"
          >
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
            class="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition"
          >
            Guardar
          </button>
          <button
            type="button"
            id="cancel-expense"
            class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
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

  cancelButton?.addEventListener("click", () => state.goToDashboard(store));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentSharedExpenseId = store.getCurrentSharedExpenseId();
    if (!currentSharedExpenseId) {
      showToast("No hay un gasto compartido seleccionado", "error");
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
          amount: parseFloat(formData.get("amount") as string),
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
