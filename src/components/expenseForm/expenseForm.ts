import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Expense } from "../../types";
import { showToast } from "../../util/toast";

/**
 * Render: Formulario para agregar gastos
 */
export default function renderExpenseForm(
  _state: AppState,
  store: AppStore
): string {
  const participants = store.getParticipants();

  return `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Agregar Gasto</h2>
      <form id="expense-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Quién pagó</label>
          <select name="payerId" required class="w-full p-2 border rounded">
            <option value="">Selecciona...</option>
            ${participants
              .map(
                (p) => `
              <option value="${p.id}">${p.name}</option>
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
 * Setup: Maneja el formulario de gastos
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
      alert("No hay un gasto compartido seleccionado");
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
          payerId: formData.get("payerId") as string,
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          date: new Date().toISOString(),
        } as Expense,
        "dashboard"
      );
      showToast("Gasto guardado");
    } catch (_error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Guardar";
      }
      alert("Error al agregar el gasto");
    }
  });
}
