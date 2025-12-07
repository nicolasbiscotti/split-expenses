import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { calculateBalances, calculateDebts } from "../../util/calculations";
import renderDebtList from "./debtList";

/**
 * Render: Dashboard principal con resumen y balances
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
 * Render: Resumen total de gastos
 */
function renderTotalSummary(total: number, count: number): string {
  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-2">Resumen Total</h2>
      <p class="text-3xl font-bold text-blue-600">$${total.toFixed(2)}</p>
      <p class="text-sm text-gray-600">${count} gasto${
    count !== 1 ? "s" : ""
  } registrado${count !== 1 ? "s" : ""}</p>
    </div>
  `;
}

/**
 * Render: Lista de balances por persona
 */
function renderBalancesList(balances: any[], participants: any[]): string {
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
 * Render: Item individual de balance
 */
function renderBalanceItem(balance: any, participants: any[]): string {
  const participant = participants.find((p) => p.id === balance.participantId);
  const isPositive = balance.balance > 0.01;
  const isNegative = balance.balance < -0.01;

  return `
    <div class="flex justify-between items-center p-2 rounded ${
      isPositive ? "bg-green-50" : isNegative ? "bg-red-50" : "bg-gray-50"
    }">
      <span class="font-medium">${participant?.name || "Desconocido"}</span>
      <span class="font-bold ${
        isPositive
          ? "text-green-600"
          : isNegative
          ? "text-red-600"
          : "text-gray-600"
      }">
        ${isPositive ? "+" : ""}$${balance.balance.toFixed(2)}
      </span>
    </div>
  `;
}

/**
 * Setup: Dashboard generalmente no necesita interacciones
 * Todo se maneja a través de la navegación del bottomNavBar
 */
export function setupDashboard(
  _container: HTMLElement,
  _state: AppState,
  _store: AppStore
): void {
  // El dashboard es principalmente de lectura
  // Las acciones (agregar gasto, pago) se manejan desde el navbar
  // Si en el futuro necesitas botones interactivos en el dashboard,
  // agrégalos aquí
}
