import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Paso 2 del wizard - Selección de participantes
 */
export default function renderCreateStep2(
  state: AppState,
  store: AppStore
): string {
  const allUserContact = store.getContacts();
  const selectedIds = state.getNewSharedExpenseData().participantIds;

  return `
    <div class="mb-6">
      <button 
        id="back-to-step-1" 
        class="text-blue-600 flex items-center gap-1 mb-4"
      >
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

      <div id="participants-list" class="space-y-2">
        ${allUserContact
          .map(
            (participant) => `
          <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 ${
            selectedIds.includes(participant.id)
              ? "bg-blue-50 border-blue-300"
              : ""
          }">
            <input 
              type="checkbox" 
              value="${participant.id}" 
              ${selectedIds.includes(participant.id) ? "checked" : ""}
              class="participant-checkbox w-5 h-5"
              data-participant-id="${participant.id}"
            >
            <span class="font-medium">${participant.name}</span>
          </label>
        `
          )
          .join("")}
      </div>
    </div>

    <button 
      id="continue-to-step-3"
      ${selectedIds.length < 2 ? "disabled" : ""}
      class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      Continuar
    </button>
  `;
}

/**
 * Setup: Maneja selección de participantes
 */
export function setupCreateStep2(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const backButton =
    container.querySelector<HTMLButtonElement>("#back-to-step-1");
  const continueButton = container.querySelector<HTMLButtonElement>(
    "#continue-to-step-3"
  );
  const checkboxes = container.querySelectorAll<HTMLInputElement>(
    ".participant-checkbox"
  );

  // Handler: Volver al paso anterior
  const handleBack = () => {
    state.goToPreviousStep(store);
  };

  // Handler: Continuar al siguiente paso
  const handleContinue = () => {
    if (state.canProceedToStep3()) {
      state.goToNextStep(store);
    } else {
      alert("Debes seleccionar al menos 2 participantes");
    }
  };

  // Handler: Toggle participante
  const handleParticipantToggle = (participantId: string) => {
    state.toggleParticipantInNew(participantId, store);
  };

  // Event listeners
  backButton?.addEventListener("click", handleBack);
  continueButton?.addEventListener("click", handleContinue);

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const participantId = checkbox.dataset.participantId;
      if (participantId) {
        handleParticipantToggle(participantId);
      }
    });
  });
}
