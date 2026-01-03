import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Step 3 of the wizard - Confirmation and creation
 */
export default function renderCreateStep3(
  state: AppState,
  _store: AppStore
): string {
  const data = state.getNewSharedExpenseData();
  const participants = data.selectedContacts;
  const adminIds = data.adminContactIds;

  return `
    <div class="mb-6">
      <button 
        id="back-to-step-2" 
        class="text-blue-600 flex items-center gap-1 mb-4"
      >
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
          <div class="mt-2 space-y-1">
            ${participants
              .map((p) => {
                const isAdmin = adminIds.includes(p.id);
                return `
                  <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">${p.displayName}</span>
                      ${
                        !p.hasAccount
                          ? '<span class="text-xs text-gray-500">(sin cuenta)</span>'
                          : ""
                      }
                    </div>
                    ${
                      isAdmin
                        ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Admin</span>'
                        : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Participante</span>'
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>
    </div>

    <!-- Info about participants without accounts -->
    ${
      participants.some((p) => !p.hasAccount)
        ? `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p class="text-sm text-blue-800">
          <strong>ℹ️ Nota:</strong> Algunos participantes aún no tienen cuenta. 
          Como administrador, podrás registrar gastos y pagos en su nombre. 
          Cuando creen su cuenta, tendrán acceso automático.
        </p>
      </div>
    `
        : ""
    }

    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <p class="text-sm text-green-800">
        ${
          data.type === "unique"
            ? "✓ Este gasto compartido estará activo hasta que lo cierres manualmente cuando los balances estén correctos."
            : "✓ Este gasto compartido será recurrente. Podrás cerrar períodos y crear nuevos cuando lo necesites."
        }
      </p>
    </div>

    <button 
      id="create-shared-expense-btn"
      class="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
    >
      <span id="button-text">Crear Gasto Compartido</span>
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
 * Setup: Handle shared expense creation
 */
export function setupCreateStep3(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const backButton =
    container.querySelector<HTMLButtonElement>("#back-to-step-2");
  const createButton = container.querySelector<HTMLButtonElement>(
    "#create-shared-expense-btn"
  );
  const buttonText = container.querySelector("#button-text");
  const buttonLoading = container.querySelector("#button-loading");

  const handleBack = () => {
    state.goToPreviousStep(store);
  };

  const handleCreate = async () => {
    if (!createButton) return;

    // Show loading
    createButton.disabled = true;
    buttonText?.classList.add("hidden");
    buttonLoading?.classList.remove("hidden");

    try {
      const currentUser = store.getCurrentUser();
      if (!currentUser) {
        alert("Debes estar logueado para crear un gasto compartido");
        state.setCurrentView("login", store);
        return;
      }

      const data = state.getNewSharedExpenseData();

      // Final validation
      if (!state.isNewSharedExpenseValid()) {
        throw new Error(
          "Datos inválidos. Verifica que tengas al menos 2 participantes y 1 administrador."
        );
      }

      const sharedExpenseId = await store.createSharedExpense(data);
      await store.setCurrentSharedExpenseId(sharedExpenseId);

      // Clear temporary data
      state.resetNewSharedExpenseData();

      // Go to dashboard
      state.goToDashboard(store);
    } catch (error: any) {
      console.error("Error al crear gasto compartido:", error);
      alert(
        error.message ||
          "Hubo un error al crear el gasto compartido. Por favor intenta de nuevo."
      );

      // Restore button
      createButton.disabled = false;
      buttonText?.classList.remove("hidden");
      buttonLoading?.classList.add("hidden");
    }
  };

  // Event listeners
  backButton?.addEventListener("click", handleBack);
  createButton?.addEventListener("click", handleCreate);
}
