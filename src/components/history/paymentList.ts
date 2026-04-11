import type AppStore from "../../store";
import type { Payment, SharedExpenseParticipant } from "../../types";
import { formatCurrency, formatDate } from "../../util/format";
import { showToast } from "../../util/toast";
import { icon, renderIcons } from "../../util/icons";

/**
 * Render: Single payment item
 */
export function renderPaymentItem(payment: Payment, participants: SharedExpenseParticipant[]): string {
  const resolveName = (email: string) => {
    const p = participants.find((p) => p.email === email);
    return p ? (p.displayName !== p.email ? p.displayName : p.email) : email ?? "Desconocido";
  };

  return `
    <div class="flex justify-between items-center p-2 bg-green-50 rounded">
      <div>
        <p class="font-medium">
          ${resolveName(payment.fromEmail)} → ${resolveName(payment.toEmail)}
        </p>
        <p class="text-sm text-gray-600">
          ${formatDate(payment.date)}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600">${formatCurrency(payment.amount)}</span>
        <button
          class="delete-payment-btn text-red-600 hover:text-red-800"
          data-payment-id="${payment.id}"
          title="Eliminar pago"
        >
          ${icon("trash-2", "w-4 h-4")}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render: Payments section card with title, list, and optional load-more button
 */
export function renderPaymentList(payments: Payment[], hasMore: boolean, participants: SharedExpenseParticipant[]): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">${icon("arrow-right-left", "w-5 h-5")} Pagos</h2>
      ${
        payments.length === 0
          ? '<p class="text-gray-500">No hay pagos registrados</p>'
          : `
          <div class="space-y-2">
            ${payments.map((payment) => renderPaymentItem(payment, participants)).join("")}
          </div>
          ${hasMore ? `<button id="load-more-payments" class="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1">Cargar más pagos ${icon("chevron-down", "w-4 h-4")}</button>` : ""}
        `
      }
    </div>
  `;
}

/**
 * Setup: Attaches delete and load-more handlers for the payment list
 */
export function setupPaymentList(container: HTMLElement, store: AppStore): void {
  container.querySelector("#load-more-payments")?.addEventListener("click", () => {
    store.loadMorePayments();
  });

  // Use closest() to handle clicks on child nodes of the button (e.g. emoji text)
  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".delete-payment-btn");
    if (!btn) return;

    const paymentId = btn.dataset.paymentId;
    if (!paymentId) return;

    if (confirm("¿Eliminar este pago?")) {
      btn.disabled = true;
      btn.innerHTML = icon("loader-2", "w-4 h-4 animate-spin");
      renderIcons();
      store.deletePayment(paymentId, "history").catch((error) => {
        btn.disabled = false;
        btn.innerHTML = icon("trash-2", "w-4 h-4");
        renderIcons();
        const message = (error as { code?: string }).code === "permission-denied"
          ? "No tienes permiso para eliminar este pago"
          : "Error al eliminar el pago";
        showToast(message, "error");
      });
    }
  });
}
