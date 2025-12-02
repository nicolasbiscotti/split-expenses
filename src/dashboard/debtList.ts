import type { Debt, Participant } from "../types";

export default function renderDebtList(debts: Debt[], participants: Participant[]) {
  return `${
    debts.length > 0
      ? `
            <div class="bg-white rounded-lg shadow p-4">
              <h2 class="text-lg font-semibold mb-3">Cómo Saldar Cuentas</h2>
              <div class="space-y-2">
                ${debts
                  .map((debt) => {
                    const from = participants.find((u) => u.id === debt.fromId);
                    const to = participants.find((u) => u.id === debt.toId);
                    return `
                    <div class="flex items-center gap-2 p-3 bg-yellow-50 rounded">
                      <span class="font-medium">${from?.name}</span>
                      <span class="text-gray-600">→</span>
                      <span class="font-medium">${to?.name}</span>
                      <span class="ml-auto font-bold text-yellow-700">$${debt.amount.toFixed(
                        2
                      )}</span>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `
      : ""
  }`;
}
