import type AppState from "../../state/AppState";
import type AppStore from "../../store";

export default function renderCreateStep3(state: AppState, store: AppStore) {
  return `
        <div class="mb-6">
          <button onclick="goToCreateStep(2)" class="text-blue-600 flex items-center gap-1 mb-4">
            ← Volver
          </button>
          <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
          <p class="text-gray-600">Paso 3 de 3: Confirmar</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6 mb-4">
          <h3 class="font-semibold mb-4">Resumen</h3>
          
          <div class="space-y-3 text-sm">
            <div>
              <span class="text-gray-600">Nombre:</span>
              <span class="font-medium ml-2">${
                state.getNewSharedExpenseData().name
              }</span>
            </div>
            
            ${
              state.getNewSharedExpenseData().description
                ? `
              <div>
                <span class="text-gray-600">Descripción:</span>
                <span class="font-medium ml-2">${
                  state.getNewSharedExpenseData().description
                }</span>
              </div>
            `
                : ""
            }
            
            <div>
              <span class="text-gray-600">Tipo:</span>
              <span class="font-medium ml-2">${
                state.getNewSharedExpenseData().type === "unique"
                  ? "Único"
                  : "Recurrente"
              }</span>
            </div>
            
            <div>
              <span class="text-gray-600">Participantes:</span>
              <div class="mt-2 flex flex-wrap gap-2">
                ${store
                  .getParticipantsByIds(
                    state.getNewSharedExpenseData().participantIds
                  )
                  .map(
                    (participant) => `
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${participant.name}</span>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-800">
            ${
              state.getNewSharedExpenseData().type === "unique"
                ? "✓ Este gasto compartido estará activo hasta que lo cierres manualmente cuando los balances estén correctos."
                : "✓ Este gasto compartido será recurrente. Podrás cerrar períodos y crear nuevos cuando lo necesites."
            }
          </p>
        </div>

        <button 
          onclick="finishCreate()" 
          class="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition"
        >
          Crear Gasto Compartido
        </button>
      `;
}
