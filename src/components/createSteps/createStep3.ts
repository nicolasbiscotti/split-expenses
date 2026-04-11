import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { SharedExpense } from "../../types";
import { icon } from "../../util/icons";

/**
 * Render: Step 3 of the wizard - review and confirm
 */
export default function renderCreateStep3(
  state: AppState,
  _store: AppStore
): string {
  const data = state.getNewSharedExpenseData();

  return `
    <div class="mb-6">
      <button id="back-to-step-2" class="text-blue-600 flex items-center gap-1 mb-4">
        ${icon("arrow-left", "w-4 h-4")} Volver
      </button>
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">${icon("folder-plus", "w-6 h-6")} Crear Gasto Compartido</h1>
      <p class="text-gray-600">Paso 3 de 3: Confirmar</p>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-4">
      <h3 class="font-semibold mb-4">Resumen</h3>

      <div class="space-y-3 text-sm">
        <div>
          <span class="text-gray-600">Nombre:</span>
          <span class="font-medium ml-2">${data.name}</span>
        </div>

        ${
          data.description
            ? `
          <div>
            <span class="text-gray-600">Descripción:</span>
            <span class="font-medium ml-2">${data.description}</span>
          </div>
        `
            : ""
        }

        <div>
          <span class="text-gray-600">Tipo:</span>
          <span class="font-medium ml-2">${
            data.type === "unique" ? "Único" : "Recurrente"
          }</span>
        </div>

        <div>
          <span class="text-gray-600">Participantes:</span>
          <div class="mt-2 flex flex-wrap gap-2">
            ${data.participants
              .map(
                (p) => `
              <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                ${p.displayName !== p.email ? p.displayName : p.email}
              </span>
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
          data.type === "unique"
            ? "✓ Este gasto compartido estará activo hasta que lo cierres manualmente cuando los balances estén correctos."
            : "✓ Este gasto compartido será recurrente. Podrás cerrar períodos y crear nuevos cuando lo necesites."
        }
      </p>
    </div>

    <button
      id="create-shared-expense-btn"
      class="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
    >
      <span id="button-text" class="flex items-center gap-2">${icon("folder-plus", "w-5 h-5")} Crear Gasto Compartido</span>
      <span id="button-loading" class="hidden">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="ml-2">Creando...</span>
      </span>
    </button>
  `;
}

/**
 * Setup: handles shared expense creation
 */
export function setupCreateStep3(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const backButton = container.querySelector<HTMLButtonElement>("#back-to-step-2");
  const createButton = container.querySelector<HTMLButtonElement>("#create-shared-expense-btn");
  const buttonText = container.querySelector("#button-text");
  const buttonLoading = container.querySelector("#button-loading");

  backButton?.addEventListener("click", () => state.goToPreviousStep(store));

  createButton?.addEventListener("click", async () => {
    if (!createButton) return;

    createButton.disabled = true;
    buttonText?.classList.add("hidden");
    buttonLoading?.classList.remove("hidden");

    try {
      const data = state.getNewSharedExpenseData();
      const currentUser = store.getCurrentUser();

      if (!state.isNewSharedExpenseValid() || !currentUser) {
        throw new Error("Invalid data");
      }

      const participantUids = data.participants
        .filter((p) => p.uid)
        .map((p) => p.uid!);

      const participantEmails = data.participants.map((p) => p.email);

      const newSharedExpense: SharedExpense = {
        id: "",
        name: data.name,
        description: data.description,
        type: data.type,
        status: "active",
        creatorUid: currentUser.uid,
        participants: data.participants,
        participantUids,
        participantEmails,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      await store.createSharedExpense(newSharedExpense);

      state.resetNewSharedExpenseData();
      state.goToDashboard(store);
    } catch (error) {
      console.error("Failed to create shared expense:", error);
      alert("Hubo un error al crear el gasto compartido. Por favor intenta de nuevo.");

      createButton.disabled = false;
      buttonText?.classList.remove("hidden");
      buttonLoading?.classList.add("hidden");
    }
  });
}
