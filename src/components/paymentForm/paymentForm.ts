import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Payment } from "../../types";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import renderDebtList from "../dashboard/debtList";
import { renderPaymentList } from "../history/paymentList";
import { showToast } from "../../util/toast";

/**
 * Render: Payment form + debt suggestions
 */
export default function renderPaymentForm(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const participants = store.getParticipantsForSharedExpense(currentId);
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
            <select name="fromEmail" required class="w-full p-2 border rounded">
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
            <label class="block text-sm font-medium mb-1">A quién paga</label>
            <select name="toEmail" required class="w-full p-2 border rounded">
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
      ${renderPaymentList(payments, store.getHasMorePayments(), participants)}
    </div>
  `;
}

/**
 * Setup: Handles the payment form submission
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
      showToast("No hay un gasto compartido seleccionado", "error");
      return;
    }

    const formData = new FormData(form);
    const fromEmail = formData.get("fromEmail") as string;
    const toEmail = formData.get("toEmail") as string;

    if (fromEmail === toEmail) {
      showToast("No puedes registrar un pago a la misma persona", "error");
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
          fromEmail,
          toEmail,
          amount: parseFloat(formData.get("amount") as string),
          date: new Date().toISOString(),
        } as Payment,
        "dashboard"
      );
      showToast("Pago registrado");
    } catch (error) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Guardar";
      }
      const message = (error as { code?: string }).code === "permission-denied"
        ? "No tienes permiso para registrar este gasto"
        : "Error al registrar el pago";
      showToast(message, "error");
    }
  });
}
