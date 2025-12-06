import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import renderDebtList from "../dashboard/debtList";

/**
 * Render: Formulario para registrar pagos + sugerencias de deudas
 */
export default function renderPaymentForm(
  state: AppState,
  store: AppStore
): string {
  const participants = store.getParticipants();
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const balances = calculateBalances(participants, expenses, payments);
  const debts = calculateDebts(balances);

  return `
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">Registrar Pago</h2>
        <form id="payment-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Quién paga</label>
            <select name="fromId" required class="w-full p-2 border rounded">
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
            <label class="block text-sm font-medium mb-1">A quién paga</label>
            <select name="toId" required class="w-full p-2 border rounded">
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
 * Setup: Maneja el formulario de pagos
 */
export function setupPaymentForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const cancelButton = form.querySelector<HTMLButtonElement>("#cancel-payment");

  // Handler: Cancelar y volver al dashboard
  const handleCancel = () => {
    state.goToDashboard(store);
  };

  // Event listeners
  cancelButton?.addEventListener("click", handleCancel);

  // El submit se maneja en main.ts con event delegation
}
