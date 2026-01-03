import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { Expense, Payment, ResolvedContact } from "../../types";
import { formatCurrency } from "../../util/currency";

/**
 * Render: History of expenses and payments
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
 * Render: Expenses section
 */
function renderExpensesSection(
  expenses: Expense[],
  participants: ResolvedContact[]
): string {
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
 * Render: Individual expense item
 */
function renderExpenseItem(
  expense: Expense,
  participants: ResolvedContact[]
): string {
  const payer = participants.find((p) => p.id === expense.payerContactId);

  return `
    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
      <div>
        <p class="font-medium">${expense.description}</p>
        <p class="text-sm text-gray-600">
          ${payer?.displayName || "Desconocido"}${
    !payer?.hasAccount ? " *" : ""
  } · ${new Date(expense.date).toLocaleDateString("es-AR")}
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
 * Render: Payments section
 */
function renderPaymentsSection(
  payments: Payment[],
  participants: ResolvedContact[]
): string {
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
 * Render: Individual payment item
 */
function renderPaymentItem(
  payment: Payment,
  participants: ResolvedContact[]
): string {
  const from = participants.find((p) => p.id === payment.fromContactId);
  const to = participants.find((p) => p.id === payment.toContactId);

  return `
    <div class="flex justify-between items-center p-2 bg-green-50 rounded">
      <div>
        <p class="font-medium">
          ${from?.displayName || "Desconocido"}${
    !from?.hasAccount ? " *" : ""
  } → ${to?.displayName || "Desconocido"}${!to?.hasAccount ? " *" : ""}
        </p>
        <p class="text-sm text-gray-600">
          ${new Date(payment.date).toLocaleDateString("es-AR")}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600">${formatCurrency(
          payment.amount
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
 * Setup: Handle expense and payment deletion
 */
export function setupHistory(
  container: HTMLElement,
  _state: AppState,
  store: AppStore
): void {
  // Handler: Delete expense
  const handleDeleteExpense = async (id: string) => {
    if (confirm("¿Eliminar este gasto?")) {
      try {
        await store.deleteExpense(id, "history");
      } catch (error) {
        alert("Error al eliminar el gasto");
      }
    }
  };

  // Handler: Delete payment
  const handleDeletePayment = async (id: string) => {
    if (confirm("¿Eliminar este pago?")) {
      try {
        await store.deletePayment(id, "history");
      } catch (error) {
        alert("Error al eliminar el pago");
      }
    }
  };

  // Event delegation for delete buttons
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Delete expense
    if (target.classList.contains("delete-expense-btn")) {
      const expenseId = target.dataset.expenseId;
      if (expenseId) {
        handleDeleteExpense(expenseId);
      }
    }

    // Delete payment
    if (target.classList.contains("delete-payment-btn")) {
      const paymentId = target.dataset.paymentId;
      if (paymentId) {
        handleDeletePayment(paymentId);
      }
    }
  });
}
