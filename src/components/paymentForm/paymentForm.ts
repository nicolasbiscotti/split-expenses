import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import renderDebtList from "../dashboard/debtList";

/**
 * Render: Form to register payments + debt suggestions
 */
export default function renderPaymentForm(
  _state: AppState,
  store: AppStore
): string {
  const participants = store.getParticipants();
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const balances = calculateBalances(participants, expenses, payments);
  const debts = calculateDebts(balances);
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
        <p class="text-yellow-700">No se pueden agregar más pagos a este gasto compartido.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">Registrar Pago</h2>
        
        ${
          !isAdmin
            ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p class="text-sm text-yellow-800">
              Solo puedes registrar tus propios pagos. Contacta al administrador para registrar pagos de otros participantes.
            </p>
          </div>
        `
            : ""
        }
        
        <form id="payment-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Quién paga</label>
            <select name="fromContactId" required class="w-full p-2 border rounded">
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
            <label class="block text-sm font-medium mb-1">A quién paga</label>
            <select name="toContactId" required class="w-full p-2 border rounded">
              <option value="">Selecciona...</option>
              ${participants
                .map(
                  (p) => `
                  <option value="${p.id}">
                    ${p.displayName}${!p.hasAccount ? " (sin cuenta)" : ""}
                  </option>
                `
                )
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
          
          <div class="flex gap-2">
            <button 
              type="submit" 
              class="flex-1 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition"
            >
              Guardar
            </button>
            <button 
              type="button" 
              id="cancel-payment" 
              class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      ${renderDebtList(debts, participants)}
    </div>
  `;
}

/**
 * Setup: Handle payment form
 */
export function setupPaymentForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const cancelButton = form.querySelector<HTMLButtonElement>("#cancel-payment");

  // Handler: Cancel and go back to dashboard
  const handleCancel = () => {
    state.goToDashboard(store);
  };

  // Event listeners
  cancelButton?.addEventListener("click", handleCancel);

  // Submit is handled in main.ts with event delegation
}
