import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Payment } from "../../types";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import renderDebtList from "../dashboard/debtList";
import { showToast } from "../../util/toast";

/**
 * Render: Formulario para registrar pagos + sugerencias de deudas
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
  const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');

  cancelButton?.addEventListener("click", () => state.goToDashboard(store));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentSharedExpenseId = store.getCurrentSharedExpenseId();
    if (!currentSharedExpenseId) {
      alert("No hay un gasto compartido seleccionado");
      return;
    }

    const formData = new FormData(form);
    const fromId = formData.get("fromId") as string;
    const toId = formData.get("toId") as string;

    if (fromId === toId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";
    }

    try {
      await store.addPayment(
        {
          sharedExpenseId: currentSharedExpenseId,
          fromId,
          toId,
          amount: parseFloat(formData.get("amount") as string),
          date: new Date().toISOString(),
        } as Payment,
        "dashboard"
      );
      showToast("Pago registrado");
    } catch (_error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Guardar";
      }
      alert("Error al registrar el pago");
    }
  });
}
