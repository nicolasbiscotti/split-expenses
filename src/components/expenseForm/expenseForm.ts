import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Form to add expenses
 */
export default function renderExpenseForm(
  _state: AppState,
  store: AppStore
): string {
  const participants = store.getParticipants();
  const currentUserContact = store.getCurrentUserContact();
  const isAdmin = store.isCurrentUserAdmin();
  const currentSharedExpense = store.getSharedExpense(
    store.getCurrentSharedExpenseId()!
  );
  const isClosed = currentSharedExpense?.status === "closed";

  if (isClosed) {
    return `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div class="text-4xl mb-4">🔒</div>
        <h3 class="text-lg font-semibold text-yellow-800 mb-2">Gasto Compartido Cerrado</h3>
        <p class="text-yellow-700">No se pueden agregar más gastos a este gasto compartido.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Agregar Gasto</h2>
      
      ${
        !isAdmin
          ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p class="text-sm text-yellow-800">
            Solo puedes registrar gastos propios. Contacta al administrador para registrar gastos de otros participantes.
          </p>
        </div>
      `
          : ""
      }
      
      <form id="expense-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Quién pagó</label>
          <select name="payerContactId" required class="w-full p-2 border rounded">
            <option value="">Selecciona...</option>
            ${participants
              .map((p) => {
                // If not admin, only show current user
                if (!isAdmin && p.id !== currentUserContact?.id) {
                  return "";
                }
                return `
                  <option value="${p.id}" ${
                  p.id === currentUserContact?.id ? "selected" : ""
                }>
                    ${p.displayName}${!p.hasAccount ? " (sin cuenta)" : ""}
                  </option>
                `;
              })
              .join("")}
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Monto (ARS)</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input 
              type="number" 
              name="amount" 
              step="0.01" 
              min="0.01"
              required 
              class="w-full p-2 pl-8 border rounded" 
              placeholder="0,00"
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
 * Setup: Handle expense form
 */
export function setupExpenseForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const cancelButton = form.querySelector<HTMLButtonElement>("#cancel-expense");

  // Handler: Cancel and go back to dashboard
  const handleCancel = () => {
    state.goToDashboard(store);
  };

  // Event listeners
  cancelButton?.addEventListener("click", handleCancel);

  // Submit is handled in main.ts with event delegation
}
