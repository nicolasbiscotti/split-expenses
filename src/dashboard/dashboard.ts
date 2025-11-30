import type AppStore from "../store";
import { calculateBalances, calculateDebts } from "../util/calculations";

export default function renderDashboard(store: AppStore) {
  const users = store.getUsers();
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const balances = calculateBalances(users, expenses, payments);
  const debts = calculateDebts(balances);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return `
        <div class="space-y-4">
          <div class="bg-white rounded-lg shadow p-4">
            <h2 class="text-lg font-semibold mb-2">Resumen Total</h2>
            <p class="text-3xl font-bold text-blue-600">$${totalExpenses.toFixed(
              2
            )}</p>
            <p class="text-sm text-gray-600">${
              expenses.length
            } gastos registrados</p>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <h2 class="text-lg font-semibold mb-3">Balance por Persona</h2>
            <div class="space-y-2">
              ${balances
                .map((b) => {
                  const user = users.find((u) => u.id === b.userId);
                  const isPositive = b.balance > 0.01;
                  const isNegative = b.balance < -0.01;
                  return `
                  <div class="flex justify-between items-center p-2 rounded ${
                    isPositive
                      ? "bg-green-50"
                      : isNegative
                      ? "bg-red-50"
                      : "bg-gray-50"
                  }">
                    <span class="font-medium">${user?.name}</span>
                    <span class="font-bold ${
                      isPositive
                        ? "text-green-600"
                        : isNegative
                        ? "text-red-600"
                        : "text-gray-600"
                    }">
                      ${isPositive ? "+" : ""}$${b.balance.toFixed(2)}
                    </span>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>

          ${
            debts.length > 0
              ? `
            <div class="bg-white rounded-lg shadow p-4">
              <h2 class="text-lg font-semibold mb-3">Cómo Saldar Cuentas</h2>
              <div class="space-y-2">
                ${debts
                  .map((debt) => {
                    const from = users.find((u) => u.id === debt.fromId);
                    const to = users.find((u) => u.id === debt.toId);
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
          }
        </div>
      `;
}
