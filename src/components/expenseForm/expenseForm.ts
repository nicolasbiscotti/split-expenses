import type AppState from "../../state/AppState";
import type AppStore from "../../store";

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
 * NOTA: Este setup se ejecuta desde el event delegation global en main.ts
 * Aquí documentamos el comportamiento esperado
 */
export function setupExpenseForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const cancelButton = form.querySelector<HTMLButtonElement>("#cancel-expense");

  // Handler: Cancelar y volver al dashboard
  const handleCancel = () => {
    state.goToDashboard(store);
  };

  // Event listeners
  cancelButton?.addEventListener("click", handleCancel);

  // El submit se maneja en main.ts con event delegation
  // porque necesita acceso al FormData
}
