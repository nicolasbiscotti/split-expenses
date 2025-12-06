import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Paso 1 del wizard - Información básica
 */
export default function renderCreateStep1(state: AppState): string {
  const data = state.getNewSharedExpenseData();

  return `
    <div class="mb-6">
      <button 
        id="back-to-list" 
        class="text-blue-600 flex items-center gap-1 mb-4"
      >
        ← Volver
      </button>
      <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
      <p class="text-gray-600">Paso 1 de 3: Información básica</p>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <form id="create-step-1-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Nombre *</label>
          <input 
            type="text" 
            id="expense-name-input"
            name="name" 
            required 
            value="${data.name}"
            class="w-full p-2 border rounded" 
            placeholder="Ej: Vacaciones 2024, Gastos Casa"                
          >
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Descripción (opcional)</label>
          <textarea 
            id="expense-description-input"
            name="description" 
            class="w-full p-2 border rounded" 
            rows="3"
            placeholder="Describe brevemente este gasto compartido"
          >${data.description}</textarea>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Tipo *</label>
          <div class="space-y-3">
            <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="type" 
                value="unique" 
                ${data.type === "unique" ? "checked" : ""} 
                class="mt-1"
              >
              <div>
                <div class="font-medium">Único</div>
                <div class="text-sm text-gray-600">
                  Se cierra cuando los balances estén correctos según el usuario
                </div>
              </div>
            </label>
            
            <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="type" 
                value="recurring" 
                ${data.type === "recurring" ? "checked" : ""} 
                class="mt-1"
              >
              <div>
                <div class="font-medium">Recurrente</div>
                <div class="text-sm text-gray-600">
                  Podrás cerrar y abrir nuevos períodos (ej: Enero 2025, Febrero 2025)
                </div>
              </div>
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Continuar
        </button>
      </form>
    </div>
  `;
}

/**
 * Setup: Maneja eventos del formulario
 */
export function setupCreateStep1(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const backButton = document.querySelector<HTMLButtonElement>("#back-to-list");
  const nameInput = form.querySelector<HTMLInputElement>("#expense-name-input");
  const descriptionInput = form.querySelector<HTMLTextAreaElement>(
    "#expense-description-input"
  );

  // Handler: Volver a la lista
  const handleBack = () => {
    state.goToList(store);
  };

  // Handler: Actualizar nombre (sin re-render)
  const handleNameChange = (name: string) => {
    state.setNewSharedExpenseName(name);
  };

  // Handler: Actualizar descripción (sin re-render)
  const handleDescriptionChange = (description: string) => {
    state.setNewSharedExpenseDescription(description);
  };

  // Handler: Submit del formulario
  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const formData = new FormData(form);

    // Actualizar todos los datos del formulario
    state.updateNewSharedExpenseData({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "unique" | "recurring",
    });

    // Validar y avanzar
    if (state.canProceedToStep2()) {
      state.goToNextStep(store);
    } else {
      alert("Por favor completa todos los campos requeridos");
    }
  };

  // Event listeners
  backButton?.addEventListener("click", handleBack);

  nameInput?.addEventListener("input", (e) => {
    handleNameChange((e.target as HTMLInputElement).value);
  });

  descriptionInput?.addEventListener("input", (e) => {
    handleDescriptionChange((e.target as HTMLTextAreaElement).value);
  });

  form.addEventListener("submit", handleSubmit);
}
