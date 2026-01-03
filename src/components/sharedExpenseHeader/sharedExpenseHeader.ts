import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { formatCurrency } from "../../util/currency";
import { calculateBalances } from "../../util/calculations";

/**
 * Render: Header for the selected shared expense with summary info
 * Shows name, status, total, participants count, and close button for admins
 */
export default function renderSharedExpenseHeader(
  _state: AppState,
  store: AppStore
): string {
  const currentId = store.getCurrentSharedExpenseId();
  if (!currentId) return "";

  const sharedExpense = store.getSharedExpense(currentId);
  if (!sharedExpense) return "";

  const isAdmin = store.isCurrentUserAdmin(sharedExpense);
  const participants = store.getParticipants();
  const expenses = store.getExpenses();
  const payments = store.getPayments();

  // Calculate if balances are settled
  const balances = calculateBalances(participants, expenses, payments);
  const unsettledBalances = balances.filter((b) => Math.abs(b.balance) >= 0.01);
  const isSettled = unsettledBalances.length === 0 && expenses.length > 0;

  return `
    <div class="bg-white rounded-lg shadow mb-4">
      <!-- Main Header -->
      <div class="p-4 border-b">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-gray-800">${
                sharedExpense.name
              }</h2>
              ${renderStatusBadge(sharedExpense.status)}
            </div>
            ${
              sharedExpense.description
                ? `<p class="text-sm text-gray-600 mt-1">${sharedExpense.description}</p>`
                : ""
            }
          </div>
          
          <!-- Type Badge -->
          <span class="px-2 py-1 text-xs rounded ${
            sharedExpense.type === "unique"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }">
            ${sharedExpense.type === "unique" ? "Único" : "Recurrente"}
          </span>
        </div>
      </div>
      
      <!-- Stats Row -->
      <div class="grid grid-cols-3 divide-x">
        <div class="p-3 text-center">
          <p class="text-lg font-bold text-blue-600">${formatCurrency(
            sharedExpense.totalAmount
          )}</p>
          <p class="text-xs text-gray-500">Total Gastos</p>
        </div>
        <div class="p-3 text-center">
          <p class="text-lg font-bold text-gray-700">${
            sharedExpense.participantContactIds.length
          }</p>
          <p class="text-xs text-gray-500">Participantes</p>
        </div>
        <div class="p-3 text-center">
          <p class="text-lg font-bold ${
            isSettled ? "text-green-600" : "text-yellow-600"
          }">${
    isSettled
      ? "✓ Saldado"
      : `${unsettledBalances.length} pendiente${
          unsettledBalances.length !== 1 ? "s" : ""
        }`
  }</p>
          <p class="text-xs text-gray-500">Estado Balances</p>
        </div>
      </div>
      
      <!-- Admin Actions -->
      ${
        isAdmin && sharedExpense.status === "active"
          ? `
        <div class="p-3 border-t bg-gray-50 rounded-b-lg">
          <div class="flex gap-2">
            <button 
              id="close-shared-expense-btn"
              class="flex-1 py-2 px-4 ${
                isSettled
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              } text-white rounded font-medium transition flex items-center justify-center gap-2"
              ${!isSettled ? "disabled" : ""}
              title="${
                isSettled
                  ? "Cerrar este gasto compartido"
                  : "Los balances deben estar saldados para cerrar"
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Cerrar Gasto</span>
            </button>
          </div>
          ${
            !isSettled
              ? `
            <p class="text-xs text-gray-500 mt-2 text-center">
              💡 Para cerrar, todos los balances deben estar en $0
            </p>
          `
              : ""
          }
        </div>
      `
          : ""
      }
      
      <!-- Closed Status Info -->
      ${
        sharedExpense.status === "closed"
          ? `
        <div class="p-3 border-t bg-gray-100 rounded-b-lg">
          <div class="flex items-center justify-center gap-2 text-gray-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span class="text-sm">
              Cerrado el ${
                sharedExpense.closedAt
                  ? new Date(sharedExpense.closedAt).toLocaleDateString("es-AR")
                  : "fecha desconocida"
              }
            </span>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Render status badge
 */
function renderStatusBadge(status: string): string {
  if (status === "active") {
    return `
      <span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1">
        <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        Activo
      </span>
    `;
  }
  return `
    <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
      Cerrado
    </span>
  `;
}

/**
 * Setup: Handle shared expense header interactions
 */
export function setupSharedExpenseHeader(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const closeButton = container.querySelector("#close-shared-expense-btn");

  // Handler: Close shared expense
  const handleCloseSharedExpense = async () => {
    const currentId = store.getCurrentSharedExpenseId();
    if (!currentId) return;

    const sharedExpense = store.getSharedExpense(currentId);
    if (!sharedExpense) return;

    const confirmMessage = `¿Estás seguro de que quieres cerrar "${sharedExpense.name}"?\n\nEsta acción marcará el gasto como completado y no podrás agregar más gastos o pagos.`;

    if (confirm(confirmMessage)) {
      try {
        await store.closeSharedExpense(currentId);

        // Show success and refresh
        alert("¡Gasto compartido cerrado exitosamente!");
        state.setCurrentView("dashboard", store);
      } catch (error) {
        console.error("Error closing shared expense:", error);
        alert("Error al cerrar el gasto compartido. Intenta de nuevo.");
      }
    }
  };

  // Event listeners
  closeButton?.addEventListener("click", handleCloseSharedExpense);
}
