import type AppState from "../../state/AppState";
import type AppStore from "../../store";

export default function renderCreateStep2(state: AppState, store: AppStore) {
  const allUsers = store.getParticipants();
  const selectedIds = state.getNewSharedExpenseData().participantIds;

  return `
        <div class="mb-6">
          <button onclick="goToCreateStep(1)" class="text-blue-600 flex items-center gap-1 mb-4">
            ← Volver
          </button>
          <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
          <p class="text-gray-600">Paso 2 de 3: Selecciona participantes</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6 mb-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold">Participantes seleccionados</h3>
            <span class="text-sm ${
              selectedIds.length >= 2 ? "text-green-600" : "text-red-600"
            }">
              ${selectedIds.length} / mínimo 2
            </span>
          </div>

          <div class="space-y-2">
            ${allUsers
              .map(
                (user) => `
              <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                selectedIds.includes(user.id)
                  ? "bg-blue-50 border-blue-300"
                  : ""
              }">
                <input 
                  type="checkbox" 
                  value="${user.id}" 
                  ${selectedIds.includes(user.id) ? "checked" : ""}
                  onchange="toggleParticipant('${user.id}')"
                  class="w-5 h-5"
                >
                <span class="font-medium">${user.name}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </div>

        <button 
          onclick="goToCreateStep(3)" 
          ${selectedIds.length < 2 ? "disabled" : ""}
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      `;
}
