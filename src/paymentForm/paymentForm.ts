import type AppStore from "../store";
import { calculateBalances, calculateDebts } from "../util/calculations";
import renderDebtList from "../dashboard/debtList";

export default function renderPaymentForm(store: AppStore) {
  const users = store.getUsers();
  const expenses = store.getExpenses();
  const payments = store.getPayments();
  const balances = calculateBalances(users, expenses, payments);
  const debts = calculateDebts(balances);

  return `
        <div class="space-y-4">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">Registrar Pago</h2>
            <form id="payment-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Quién paga</label>
                <select name="fromId" required class="w-full p-2 border rounded">
                  ${users
                    .map((u) => `<option value="${u.id}">${u.name}</option>`)
                    .join("")}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">A quién paga</label>
                <select name="toId" required class="w-full p-2 border rounded">
                  ${users
                    .map((u) => `<option value="${u.id}">${u.name}</option>`)
                    .join("")}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Monto</label>
                <input type="number" name="amount" step="0.01" required class="w-full p-2 border rounded" placeholder="0.00">
              </div>
              <div class="flex gap-2">
                <button type="submit" class="flex-1 bg-green-600 text-white py-2 rounded font-medium">Guardar</button>
                <button type="button" onclick="setView('dashboard')" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium">Cancelar</button>
              </div>
            </form>
          </div>

          ${renderDebtList(debts, users)}

        </div>
      `;
}
