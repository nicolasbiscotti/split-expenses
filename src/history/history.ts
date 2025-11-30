import type AppStore from "../store";

export default function renderHistory(store: AppStore) {
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const users = store.getUsers();

  return `
        <div class="space-y-4">
          <div class="bg-white rounded-lg shadow p-4">
            <h2 class="text-lg font-semibold mb-3">Gastos</h2>
            ${
              expenses.length === 0
                ? '<p class="text-gray-500">No hay gastos registrados</p>'
                : `
              <div class="space-y-2">
                ${expenses
                  .map((exp) => {
                    const payer = users.find((u) => u.id === exp.payerId);
                    return `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p class="font-medium">${exp.description}</p>
                        <p class="text-sm text-gray-600">${
                          payer?.name
                        } · ${new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold">$${exp.amount.toFixed(2)}</span>
                        <button onclick="deleteExpense('${
                          exp.id
                        }')" class="text-red-600 text-sm">🗑️</button>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            `
            }
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <h2 class="text-lg font-semibold mb-3">Pagos</h2>
            ${
              payments.length === 0
                ? '<p class="text-gray-500">No hay pagos registrados</p>'
                : `
              <div class="space-y-2">
                ${payments
                  .map((pay) => {
                    const from = users.find((u) => u.id === pay.fromId);
                    const to = users.find((u) => u.id === pay.toId);
                    return `
                    <div class="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <p class="font-medium">${from?.name} → ${to?.name}</p>
                        <p class="text-sm text-gray-600">${new Date(
                          pay.date
                        ).toLocaleDateString()}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-green-600">$${pay.amount.toFixed(
                          2
                        )}</span>
                        <button onclick="deletePayment('${
                          pay.id
                        }')" class="text-red-600 text-sm">🗑️</button>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            `
            }
          </div>
        </div>
      `;
}
