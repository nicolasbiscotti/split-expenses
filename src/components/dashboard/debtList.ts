import type { Debt, SharedExpenseParticipant } from "../../types";
import { formatCurrency } from "../../util/format";

/**
 * Render: Suggested debts to settle
 * Shared component used by dashboard and paymentForm
 */
export default function renderDebtList(
  debts: Debt[],
  participants: SharedExpenseParticipant[]
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
 * Render: Single debt item
 */
function renderDebtItem(debt: Debt, participants: SharedExpenseParticipant[]): string {
  const resolveName = (email: string) => {
    const p = participants.find((p) => p.email === email);
    return p ? (p.displayName !== p.email ? p.displayName : p.email) : email;
  };

  return `
    <div class="flex items-center gap-2 p-3 bg-yellow-50 rounded">
      <span class="font-medium">${resolveName(debt.fromEmail)}</span>
      <span class="text-gray-600">→</span>
      <span class="font-medium">${resolveName(debt.toEmail)}</span>
      <span class="ml-auto font-bold text-yellow-700">
        ${formatCurrency(debt.amount)}
      </span>
    </div>
  `;
}
