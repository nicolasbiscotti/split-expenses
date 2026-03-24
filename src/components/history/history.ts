// src/history/history.ts

import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { formatCurrency, formatDate } from "../../util/format";

/**
 * Render: Historial de gastos y pagos
 */
export default function renderHistory(
  _state: AppState,
  store: AppStore
): string {
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const participants = store.getParticipants();

  return `
    <div class="space-y-4">
      ${renderExpensesSection(expenses, participants)}
      ${renderPaymentsSection(payments, participants)}
    </div>
  `;
}

/**
 * Render: Sección de gastos
 */
function renderExpensesSection(expenses: any[], participants: any[]): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3">Gastos</h2>
      ${
        expenses.length === 0
          ? '<p class="text-gray-500">No hay gastos registrados</p>'
          : `
          <div class="space-y-2">
            ${expenses
              .map((expense) => renderExpenseItem(expense, participants))
              .join("")}
          </div>
        `
      }
    </div>
  `;
}

/**
 * Render: Item individual de gasto
 */
function renderExpenseItem(expense: any, participants: any[]): string {
  const payer = participants.find((p) => p.id === expense.payerId);

  return `
    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
      <div>
        <p class="font-medium">${expense.description}</p>
        <p class="text-sm text-gray-600">
          ${payer?.name || "Desconocido"} · ${formatDate(expense.date)}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold">${formatCurrency(expense.amount)}</span>
        <button 
          class="delete-expense-btn text-red-600 text-sm hover:text-red-800"
          data-expense-id="${expense.id}"
          title="Eliminar gasto"
        >
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Render: Sección de pagos
 */
function renderPaymentsSection(payments: any[], participants: any[]): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3">Pagos</h2>
      ${
        payments.length === 0
          ? '<p class="text-gray-500">No hay pagos registrados</p>'
          : `
          <div class="space-y-2">
            ${payments
              .map((payment) => renderPaymentItem(payment, participants))
              .join("")}
          </div>
        `
      }
    </div>
  `;
}

/**
 * Render: Item individual de pago
 */
function renderPaymentItem(payment: any, participants: any[]): string {
  const from = participants.find((p) => p.id === payment.fromId);
  const to = participants.find((p) => p.id === payment.toId);

  return `
    <div class="flex justify-between items-center p-2 bg-green-50 rounded">
      <div>
        <p class="font-medium">
          ${from?.name || "Desconocido"} → ${to?.name || "Desconocido"}
        </p>
        <p class="text-sm text-gray-600">
          ${formatDate(payment.date)}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600">${formatCurrency(payment.amount)}</span>
        <button 
          class="delete-payment-btn text-red-600 text-sm hover:text-red-800"
          data-payment-id="${payment.id}"
          title="Eliminar pago"
        >
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup: Maneja eliminación de gastos y pagos
 */
export function setupHistory(
  container: HTMLElement,
  _state: AppState,
  store: AppStore
): void {
  // Handler: Eliminar gasto
  const handleDeleteExpense = async (id: string, btn: HTMLButtonElement) => {
    if (confirm("¿Eliminar este gasto?")) {
      btn.disabled = true;
      btn.textContent = "⏳";
      try {
        await store.deleteExpense(id, "history");
      } catch (error) {
        btn.disabled = false;
        btn.textContent = "🗑️";
        alert("Error al eliminar el gasto");
      }
    }
  };

  // Handler: Eliminar pago
  const handleDeletePayment = async (id: string, btn: HTMLButtonElement) => {
    if (confirm("¿Eliminar este pago?")) {
      btn.disabled = true;
      btn.textContent = "⏳";
      try {
        await store.deletePayment(id, "history");
      } catch (error) {
        btn.disabled = false;
        btn.textContent = "🗑️";
        alert("Error al eliminar el pago");
      }
    }
  };

  // Event delegation para botones de eliminar
  // Use closest() to handle clicks on child nodes of the button (e.g. emoji text)
  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!btn) return;

    if (btn.classList.contains("delete-expense-btn")) {
      const expenseId = btn.dataset.expenseId;
      if (expenseId) handleDeleteExpense(expenseId, btn);
    }

    if (btn.classList.contains("delete-payment-btn")) {
      const paymentId = btn.dataset.paymentId;
      if (paymentId) handleDeletePayment(paymentId, btn);
    }
  });
}
