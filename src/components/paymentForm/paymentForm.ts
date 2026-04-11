import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Payment } from "../../types";
import { calculateBalancesFromNetPaid, calculateDebts } from "../../util/calculations";
import renderDebtList from "../dashboard/debtList";
import { renderPaymentList } from "../history/paymentList";
import { showToast } from "../../util/toast";
import { setupCurrencyInput } from "../../util/currencyInput";
import { icon } from "../../util/icons";

/**
 * Render: Payment form + debt suggestions
 */
export default function renderPaymentForm(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const participants = store.getParticipantsForSharedExpense(currentId);
  const payments = store.getPayments();
  const se = store.getSharedExpense(currentId);
  const balances = calculateBalancesFromNetPaid(participants, se?.totalAmount ?? 0, se?.netPaid ?? {});
  const debts = calculateDebts(balances);

  return `
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">${icon("arrow-right-left", "w-5 h-5")} Registrar Pago</h2>
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

          <div class="flex gap-2">
            <button
              type="submit"
              class="flex-1 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition flex items-center justify-center gap-1"
            >
              ${icon("check", "w-4 h-4")} Guardar
            </button>
            <button
              type="button"
              id="cancel-payment"
              class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400 transition flex items-center justify-center gap-1"
            >
              ${icon("x", "w-4 h-4")} Cancelar
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

    const formData = new FormData(form);
    const fromEmail = formData.get("fromEmail") as string;
    const toEmail = formData.get("toEmail") as string;

    if (fromEmail === toEmail) {
      showToast("No puedes registrar un pago a la misma persona", "error");
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

    try {
      await store.addPayment(
        {
          sharedExpenseId: currentSharedExpenseId,
          fromEmail,
          toEmail,
          amount,
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
        ? "No tienes permiso para registrar este pago"
        : "Error al registrar el pago";
      showToast(message, "error");
    }
  });
}
