import dispatchCreateSharedExpenseEvent from "../../eventEmitters/createSharedExpenseEvent";
import type AppStore from "../../store";

declare global {
  interface Document {
    createSharedExpense: () => void;
  }
}

export default function renderSharedExpenseList(store: AppStore) {
  const sharedExpenses = store.getSharedExpenses();

  document.createSharedExpense = () => {
    dispatchCreateSharedExpenseEvent();
  };

  if (sharedExpenses.length === 0) {
    return `
          <div class="flex flex-col items-center justify-center min-h-screen -mt-20">
            <div class="text-center mb-8">
              <div class="text-6xl mb-4">💰</div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">SplitExpenses</h1>
              <p class="text-gray-600 mb-8">Aún no tienes gastos compartidos</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm">
              <h3 class="font-semibold text-lg mb-3">¿Cómo funciona?</h3>
              <ul class="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Crea un gasto compartido</li>
                <li>✓ Agrega participantes</li>
                <li>✓ Registra gastos y pagos</li>
                <li>✓ Divide las cuentas automáticamente</li>
              </ul>
              
              <button onclick="createSharedExpense()" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition">
                Crear Primer Gasto Compartido
              </button>
            </div>
          </div>
        `;
  }

  return `
        <header class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">💰 Mis Gastos</h1>
          <p class="text-gray-600">Gestiona tus gastos compartidos</p>
        </header>

        <button onclick="createSharedExpense()" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-6 hover:bg-blue-700 transition">
          + Crear Nuevo Gasto Compartido
        </button>

        <div class="space-y-4">
          ${sharedExpenses
            .map((se) => {
              const expenses = store.getExpensesBySharedExpense(se.id);
              const totalAmount = expenses.reduce(
                (sum, e) => sum + e.amount,
                0
              );
              const participants = store.getParticipantsByIds(
                se.participantIds
              );

              return `
              <div onclick="selectSharedExpense('${
                se.id
              }')" class="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <h3 class="font-bold text-lg">${se.name}</h3>
                    ${
                      se.description
                        ? `<p class="text-sm text-gray-600">${se.description}</p>`
                        : ""
                    }
                  </div>
                  <div class="flex gap-2">
                    <span class="px-2 py-1 text-xs rounded ${
                      se.type === "unique"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }">
                      ${se.type === "unique" ? "Único" : "Recurrente"}
                    </span>
                    <span class="px-2 py-1 text-xs rounded ${
                      se.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }">
                      ${se.status === "active" ? "Activo" : "Cerrado"}
                    </span>
                  </div>
                </div>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mt-3">
                  <span>👥 ${participants.length} participantes</span>
                  <span class="font-semibold text-blue-600">$${totalAmount.toFixed(
                    2
                  )}</span>
                </div>
                
                <div class="text-xs text-gray-500 mt-2">
                  Creado: ${new Date(se.createdAt).toLocaleDateString()}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
}
