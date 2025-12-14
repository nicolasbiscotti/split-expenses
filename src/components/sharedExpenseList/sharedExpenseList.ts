import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { SharedExpense } from "../../types";

/**
 * Render: Lista de gastos compartidos o estado vacío
 */
export default function renderSharedExpenseList(
  _state: AppState,
  store: AppStore
): string {
  const sharedExpenses = store.getSharedExpenses();

  if (sharedExpenses.length === 0) {
    return renderEmptyState();
  }

  return renderList(sharedExpenses, store);
}

/**
 * Render del estado vacío
 */
function renderEmptyState(): string {
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
        
        <button 
          id="create-first-shared-expense" 
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Crear Primer Gasto Compartido
        </button>
      </div>
    </div>
  `;
}

/**
 * Render de la lista con gastos
 */
function renderList(sharedExpenses: any[], store: AppStore): string {
  return `
    <header class="mb-6">
      
    </header>

    <button 
      id="create-new-shared-expense" 
      class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-6 hover:bg-blue-700 transition"
    >
      + Crear Nuevo Gasto Compartido
    </button>

    <div id="shared-expense-list" class="space-y-4">
      ${sharedExpenses.map((se) => renderSharedExpenseCard(se, store)).join("")}
    </div>
  `;
}

/**
 * Render de una tarjeta individual
 */
function renderSharedExpenseCard(
  sharedExpense: SharedExpense,
  _store: AppStore
): string {
  const totalAmount = sharedExpense.totalAmount;
  const participants = sharedExpense.participants;

  return `
    <div 
      class="shared-expense-card bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
      data-expense-id="${sharedExpense.id}"
    >
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <h3 class="font-bold text-lg">${sharedExpense.name}</h3>
          ${
            sharedExpense.description
              ? `<p class="text-sm text-gray-600">${sharedExpense.description}</p>`
              : ""
          }
        </div>
        <div class="flex gap-2">
          <span class="px-2 py-1 text-xs rounded ${
            sharedExpense.type === "unique"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }">
            ${sharedExpense.type === "unique" ? "Único" : "Recurrente"}
          </span>
          <span class="px-2 py-1 text-xs rounded ${
            sharedExpense.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }">
            ${sharedExpense.status === "active" ? "Activo" : "Cerrado"}
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
        Creado: ${new Date(sharedExpense.createdAt).toLocaleDateString()}
      </div>
    </div>
  `;
}

/**
 * Setup: Maneja interacciones de la lista
 */
export function setupSharedExpenseList(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const createFirstButton = container.querySelector(
    "#create-first-shared-expense"
  );
  const createNewButton = container.querySelector("#create-new-shared-expense");
  const list = container.querySelector("#shared-expense-list");

  console.log("setup shared expense list ==> ", container);
  console.log("setup shared expense list ==> ", createFirstButton);
  console.log("setup shared expense list ==> ", createNewButton);
  console.log("setup shared expense list ==> ", list);

  // Handler: Iniciar flujo de creación
  const handleStartCreate = () => {
    state.startCreateFlow(store);
  };

  // Handler: Seleccionar un gasto compartido
  const handleSelectSharedExpense = async (id: string) => {
    await store.setCurrentSharedExpenseId(id);
    state.goToDashboard(store);
  };

  // Event listeners para botones de crear
  createFirstButton?.addEventListener("click", handleStartCreate);
  createNewButton?.addEventListener("click", handleStartCreate);

  // Event delegation para las tarjetas
  list?.addEventListener("click", (e) => {
    console.log("Card Clicked ==> ");

    const card = (e.target as HTMLElement).closest(".shared-expense-card");
    if (card) {
      console.log("Card ==> ", card);
      const expenseId = card.getAttribute("data-expense-id");
      if (expenseId) {
        console.log("expense id ==> ", expenseId);
        handleSelectSharedExpense(expenseId);
      }
    }
  });
}
