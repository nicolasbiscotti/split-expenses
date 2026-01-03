import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import { formatCurrency, formatBalance } from "../../util/currency";
import renderDebtList from "./debtList";
import type { Balance, ResolvedContact } from "../../types";

/**
 * Render: Main dashboard with summary and balances
 */
export default function renderDashboard(
  _state: AppState,
  store: AppStore
): string {
  const participants = store.getParticipants();
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const balances = calculateBalances(participants, expenses, payments);
  const debts = calculateDebts(balances);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return `
    <div class="space-y-4">
      ${renderTotalSummary(totalExpenses, expenses.length)}
      ${renderBalancesList(balances, participants)}
      ${renderDebtList(debts, participants)}
    </div>
  `;
}

/**
 * Render: Total expenses summary
 */
function renderTotalSummary(total: number, count: number): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-2">Resumen Total</h2>
      <p class="text-3xl font-bold text-blue-600">${formatCurrency(total)}</p>
      <p class="text-sm text-gray-600">${count} gasto${
    count !== 1 ? "s" : ""
  } registrado${count !== 1 ? "s" : ""}</p>
    </div>
  `;
}

/**
 * Render: Balances list per person
 */
function renderBalancesList(
  balances: Balance[],
  participants: ResolvedContact[]
): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3">Balance por Persona</h2>
      <div class="space-y-2">
        ${balances
          .map((balance) => renderBalanceItem(balance, participants))
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Render: Individual balance item
 */
function renderBalanceItem(
  balance: Balance,
  participants: ResolvedContact[]
): string {
  const participant = participants.find(
    (p) => p.id === balance.participantContactId
  );
  const isPositive = balance.balance > 0.01;
  const isNegative = balance.balance < -0.01;

  return `
    <div class="flex justify-between items-center p-2 rounded ${
      isPositive ? "bg-green-50" : isNegative ? "bg-red-50" : "bg-gray-50"
    }">
      <div class="flex items-center gap-2">
        <span class="font-medium">${
          participant?.displayName || "Desconocido"
        }</span>
        ${
          !participant?.hasAccount
            ? '<span class="text-xs text-gray-500">(sin cuenta)</span>'
            : ""
        }
      </div>
      <span class="font-bold ${
        isPositive
          ? "text-green-600"
          : isNegative
          ? "text-red-600"
          : "text-gray-600"
      }">
        ${formatBalance(balance.balance)}
      </span>
    </div>
  `;
}

/**
 * Setup: Dashboard interactions
 */
export function setupDashboard(
  _container: HTMLElement,
  _state: AppState,
  _store: AppStore
): void {
  // Dashboard is mainly read-only
  // Actions (add expense, payment) are handled from the navbar
}
