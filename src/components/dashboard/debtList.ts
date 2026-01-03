import type { Debt, ResolvedContact } from "../../types";

/**
 * Render: List of suggested debts to settle
 * This is a shared component used by dashboard and paymentForm
 */
export default function renderDebtList(
  debts: Debt[],
  participants: ResolvedContact[]
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
 * Render: Individual debt item
 */
function renderDebtItem(debt: Debt, participants: ResolvedContact[]): string {
  const from = participants.find((p) => p.id === debt.fromContactId);
  const to = participants.find((p) => p.id === debt.toContactId);

  return `
    <div class="flex items-center gap-2 p-3 bg-yellow-50 rounded">
      <div class="flex items-center gap-1">
        <span class="font-medium">${from?.displayName || "Desconocido"}</span>
        ${
          !from?.hasAccount
            ? '<span class="text-xs text-gray-500">*</span>'
            : ""
        }
      </div>
      <span class="text-gray-600">→</span>
      <div class="flex items-center gap-1">
        <span class="font-medium">${to?.displayName || "Desconocido"}</span>
        ${!to?.hasAccount ? '<span class="text-xs text-gray-500">*</span>' : ""}
      </div>
      <span class="ml-auto font-bold text-yellow-700">
        $${debt.amount.toFixed(2)}
      </span>
    </div>
  `;
}
