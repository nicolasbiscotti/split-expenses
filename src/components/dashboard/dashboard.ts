import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { SharedExpenseParticipant } from "../../types";
import { calculateBalancesFromNetPaid, calculateDebts } from "../../util/calculations";
import { formatCurrency } from "../../util/format";
import renderDebtList from "./debtList";
import { icon } from "../../util/icons";

/**
 * Render: Main dashboard with summary and balances
 */
export default function renderDashboard(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId() ?? "";
  const participants = store.getParticipantsForSharedExpense(currentId);
  const se = store.getSharedExpense(currentId);
  const totalAmount = se?.totalAmount ?? 0;
  const expensesCount = se?.expensesCount ?? store.getExpenses().length;
  const balances = calculateBalancesFromNetPaid(participants, totalAmount, se?.netPaid ?? {});
  const debts = calculateDebts(balances);

  return `
    <div class="space-y-4">
      ${renderTotalSummary(totalAmount, expensesCount)}
      ${renderBalancesList(balances, participants)}
      ${renderDebtList(debts, participants)}
    </div>
  `;
}

/**
 * Render: Total expense summary
 */
function renderTotalSummary(total: number, count: number): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-2 flex items-center gap-2">${icon("bar-chart-2", "w-5 h-5")} Resumen Total</h2>
      <p class="text-3xl font-bold text-blue-600">${formatCurrency(total)}</p>
      <p class="text-sm text-gray-600">${count} gasto${
    count !== 1 ? "s" : ""
  } registrado${count !== 1 ? "s" : ""}</p>
    </div>
  `;
}

/**
 * Render: Balance list per person
 */
function renderBalancesList(balances: any[], participants: SharedExpenseParticipant[]): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">${icon("scale", "w-5 h-5")} Balance por Persona</h2>
      <div class="space-y-2">
        ${balances
          .map((balance) => renderBalanceItem(balance, participants))
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Render: Single balance item
 */
function renderBalanceItem(balance: any, participants: SharedExpenseParticipant[]): string {
  const participant = participants.find((p) => p.email === balance.email);
  const name = participant
    ? (participant.displayName !== participant.email ? participant.displayName : participant.email)
    : balance.email;
  const isPositive = balance.balance > 0.01;
  const isNegative = balance.balance < -0.01;

  return `
    <div class="flex justify-between items-center p-2 rounded ${
      isPositive ? "bg-green-50" : isNegative ? "bg-red-50" : "bg-gray-50"
    }">
      <span class="font-medium">${name}</span>
      <span class="font-bold ${
        isPositive
          ? "text-green-600"
          : isNegative
          ? "text-red-600"
          : "text-gray-600"
      }">
        ${isPositive ? "+" : ""}${formatCurrency(balance.balance)}
      </span>
    </div>
  `;
}

/**
 * Setup: Dashboard is read-only; actions are handled via the bottom nav bar
 */
export function setupDashboard(
  _container: HTMLElement,
  _state: AppState,
  _store: AppStore
): void {}
