import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { renderExpenseList, setupExpenseList } from "./expenseList";
import { renderPaymentList, setupPaymentList } from "./paymentList";

/**
 * Render: Expense and payment history
 */
export default function renderHistory(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const participants = store.getParticipantsForSharedExpense(currentId);

  return `
    <div class="space-y-4">
      ${renderExpenseList(expenses, store.getHasMoreExpenses(), participants)}
      ${renderPaymentList(payments, store.getHasMorePayments(), participants)}
    </div>
  `;
}

/**
 * Setup: Handles expense and payment deletion and pagination
 */
export function setupHistory(
  container: HTMLElement,
  _state: AppState,
  store: AppStore
): void {
  setupExpenseList(container, store);
  setupPaymentList(container, store);
}
