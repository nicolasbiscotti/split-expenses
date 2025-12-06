// src/history/history.ts

import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Historial de gastos y pagos
 */
export default function renderHistory(
  state: AppState,
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
          ${payer?.name || "Desconocido"} · ${new Date(
    expense.date
  ).toLocaleDateString()}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold">$${expense.amount.toFixed(2)}</span>
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
          ${new Date(payment.date).toLocaleDateString()}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600">$${payment.amount.toFixed(
          2
        )}</span>
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
  state: AppState,
  store: AppStore
): void {
  // Handler: Eliminar gasto
  const handleDeleteExpense = async (id: string) => {
    if (confirm("¿Eliminar este gasto?")) {
      try {
        await store.deleteExpense(id, "history");
        // El store ya notificó y re-renderizó
      } catch (error) {
        alert("Error al eliminar el gasto");
      }
    }
  };

  // Handler: Eliminar pago
  const handleDeletePayment = async (id: string) => {
    if (confirm("¿Eliminar este pago?")) {
      try {
        await store.deletePayment(id, "history");
        // El store ya notificó y re-renderizó
      } catch (error) {
        alert("Error al eliminar el pago");
      }
    }
  };

  // Event delegation para botones de eliminar
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Eliminar gasto
    if (target.classList.contains("delete-expense-btn")) {
      const expenseId = target.dataset.expenseId;
      if (expenseId) {
        handleDeleteExpense(expenseId);
      }
    }

    // Eliminar pago
    if (target.classList.contains("delete-payment-btn")) {
      const paymentId = target.dataset.paymentId;
      if (paymentId) {
        handleDeletePayment(paymentId);
      }
    }
  });
}
