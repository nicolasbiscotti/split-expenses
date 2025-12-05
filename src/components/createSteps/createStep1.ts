import type AppState from "../../state/AppState";
import type AppStore from "../../store";

export default function renderCreateStep1(state: AppState) {
  return `
        <div class="mb-6">
          <button onclick="setView('shared-expense-list')" class="text-blue-600 flex items-center gap-1 mb-4">
            ← Volver
          </button>
          <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
          <p class="text-gray-600">Paso 1 de 3: Información básica</p>
        </div>

        <div id="step-1-form-wrapper" class="bg-white rounded-lg shadow p-6">
          <form id="create-step-1-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Nombre *</label>
              <input 
                type="text" 
                name="name" 
                required 
                value="${state.getNewSharedExpenseData().name}"
                class="w-full p-2 border rounded" 
                placeholder="Ej: Vacaciones 2024, Gastos Casa"                
              >
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Descripción (opcional)</label>
              <textarea 
                name="description" 
                class="w-full p-2 border rounded" 
                rows="3"
                placeholder="Describe brevemente este gasto compartido"
              >${state.getNewSharedExpenseData().description}</textarea>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Tipo *</label>
              <div class="space-y-3">
                <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="type" value="unique" ${
                    state.getNewSharedExpenseData().type === "unique"
                      ? "checked"
                      : ""
                  } class="mt-1">
                  <div>
                    <div class="font-medium">Único</div>
                    <div class="text-sm text-gray-600">Se cierra cuando los balances estén correctos según el usuario</div>
                  </div>
                </label>
                
                <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="type" value="recurring" ${
                    state.getNewSharedExpenseData().type === "recurring"
                      ? "checked"
                      : ""
                  } class="mt-1">
                  <div>
                    <div class="font-medium">Recurrente</div>
                    <div class="text-sm text-gray-600">Podrás cerrar y abrir nuevos períodos (ej: Enero 2025, Febrero 2025)</div>
                  </div>
                </label>
              </div>
            </div>

            <button id="step1-to-step2" type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition">
              Continuar
            </button>
          </form>
        </div>
      `;
}

export function setupStep1(
  element: HTMLFormElement,
  state: AppState,
  store: AppStore
) {
  let sharedExpensedName = "";

  const nameInput =
    element.querySelector<HTMLInputElement>('input[name="name"]')!;

  // const toStep2Button =
  //   element.querySelector<HTMLButtonElement>("step1-to-step2")!;

  console.log("setupSTEP1 function execution ==>");

  const handleSharedExpenseNAmeCHange = (name: string) => {
    console.log("set shared expense name ==> targetValue", name);
    sharedExpensedName = name;
    if (nameInput !== null) {
      nameInput.value = name;
    }
    console.log("set shared expense name ==> inputValue", nameInput?.value);
    state.updateNewSharedExpenseData({ name });
    console.log("App State ==> ", state.getState());
  };

  const handleStepOneToStepTwo = () => {
    state.goToNextStep(store);
  };

  nameInput.addEventListener("keyup", (e) => {
    const target = e.target as HTMLInputElement;
    handleSharedExpenseNAmeCHange(target.value);
  });

  element.addEventListener("submit", (ev) => {
    console.log("step one form wrapper ==> ");
    ev.preventDefault();
    ev.stopPropagation();
    handleStepOneToStepTwo();
  });

  // toStep2Button.addEventListener("click", () => {
  //   state.setState({ view: "create-step-2", step: 2, rerender: true, store });
  // });
}
