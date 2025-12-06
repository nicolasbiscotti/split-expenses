// src/dashboard/debtList.ts

import type { Debt, Participant } from "../../types";

/**
 * Render: Lista de deudas sugeridas para saldar
 * Este es un componente compartido usado por dashboard y paymentForm
 */
export default function renderDebtList(
  debts: Debt[],
  participants: Participant[]
): string {
  if (debts.length === 0) {
    return "";
  }

  return `
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="text-lg font-semibold mb-3">Cómo Saldar Cuentas</h2>
      <div class="space-y-2">
        ${debts.map((debt) => renderDebtItem(debt, participants)).join("")}
      </div>
    </div>
  `;
}

/**
 * Render: Item individual de deuda
 */
function renderDebtItem(debt: Debt, participants: Participant[]): string {
  const from = participants.find((p) => p.id === debt.fromId);
  const to = participants.find((p) => p.id === debt.toId);

  return `
    <div class="flex items-center gap-2 p-3 bg-yellow-50 rounded">
      <span class="font-medium">${from?.name || "Desconocido"}</span>
      <span class="text-gray-600">→</span>
      <span class="font-medium">${to?.name || "Desconocido"}</span>
      <span class="ml-auto font-bold text-yellow-700">
        $${debt.amount.toFixed(2)}
      </span>
    </div>
  `;
}
