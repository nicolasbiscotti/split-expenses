import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { formatCurrency, formatDate } from "../../util/format";
import { icon } from "../../util/icons";

/**
 * Render: Lista de gastos compartidos o estado vacío
 */
export default function renderSharedExpenseList(
  _state: AppState,
  store: AppStore
): string {
  const sharedExpenses = store.getSharedExpenses();
  const user = store.getCurrentUser();

  const avatarHtml = user?.photoURL
    ? `<img src="${user.photoURL}" alt="Perfil" class="w-9 h-9 rounded-full object-cover">`
    : `<div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
        ${(user?.displayName ?? "U")[0].toUpperCase()}
       </div>`;

  if (sharedExpenses.length === 0) {
    return renderEmptyState(avatarHtml);
  }

  return renderList(sharedExpenses, store, avatarHtml);
}

function renderEmptyState(avatarHtml: string): string {
  return `
    <div class="flex flex-col min-h-screen -mt-4">
      <header class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">${icon("wallet", "w-6 h-6")} Mis Gastos</h1>
        <button onclick="setView('profile')" aria-label="Mi perfil">${avatarHtml}</button>
      </header>

      <div class="flex flex-col items-center justify-center flex-1">
        <div class="text-center mb-8">
          <p class="text-gray-600 mb-8">Aún no tienes gastos compartidos</p>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
          <h3 class="font-semibold text-lg mb-3">¿Cómo funciona?</h3>
          <ul class="space-y-2 text-sm text-gray-600 mb-6">
            <li>✓ Crea un gasto compartido</li>
            <li>✓ Invita participantes por email</li>
            <li>✓ Registra gastos y pagos</li>
            <li>✓ Divide las cuentas automáticamente</li>
          </ul>

          <button
            id="create-first-shared-expense"
            class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            ${icon("folder-plus", "w-5 h-5")} Crear Primer Gasto Compartido
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderList(sharedExpenses: any[], store: AppStore, avatarHtml: string): string {
  return `
    <header class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">${icon("wallet", "w-6 h-6")} Mis Gastos</h1>
        <p class="text-sm text-gray-500">Gestiona tus gastos compartidos</p>
      </div>
      <button onclick="setView('profile')" aria-label="Mi perfil">${avatarHtml}</button>
    </header>

    <button
      id="create-new-shared-expense"
      class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-6 hover:bg-blue-700 transition flex items-center justify-center gap-2"
    >
      ${icon("folder-plus", "w-5 h-5")} Crear Nuevo Gasto Compartido
    </button>

    <div id="shared-expense-list" class="space-y-4">
      ${sharedExpenses.map((se) => renderSharedExpenseCard(se, store)).join("")}
    </div>
  `;
}

function renderSharedExpenseCard(sharedExpense: any, store: AppStore): string {
  const isPending = store.isPendingInvite(sharedExpense);
  const totalAmount = sharedExpense.totalAmount;
  const participantCount = sharedExpense.participants?.length ?? 0;

  if (isPending) {
    return `
      <div
        class="shared-expense-card bg-amber-50 border border-amber-200 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
        data-expense-id="${sharedExpense.id}"
        data-pending-invite="true"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              ${icon("mail", "w-4 h-4 text-amber-600")}
              <span class="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Invitación pendiente
              </span>
            </div>
            <h3 class="font-bold text-lg">${sharedExpense.name}</h3>
            ${
              sharedExpense.description
                ? `<p class="text-sm text-gray-600">${sharedExpense.description}</p>`
                : ""
            }
          </div>
        </div>

        <div class="flex justify-between items-center text-sm text-gray-600 mt-3">
          <span class="flex items-center gap-1">${icon("users", "w-4 h-4")} ${participantCount} participante${participantCount !== 1 ? "s" : ""}</span>
          <span class="text-xs text-amber-600 font-medium">Toca para ver →</span>
        </div>
      </div>
    `;
  }

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
        <span>👥 ${participantCount} participante${participantCount !== 1 ? "s" : ""}</span>
        <span class="font-semibold text-blue-600">${formatCurrency(totalAmount)}</span>
      </div>

      <div class="text-xs text-gray-500 mt-2">
        Creado: ${formatDate(sharedExpense.createdAt)}
      </div>
    </div>
  `;
}

/**
 * Setup: Handles shared expense list interactions
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

  const handleStartCreate = () => {
    state.startCreateFlow(store);
  };

  const handleSelectSharedExpense = async (
    id: string,
    cardEl: HTMLElement
  ) => {
    cardEl.classList.add("opacity-50", "pointer-events-none");
    await store.setCurrentSharedExpenseId(id);
    state.goToDashboard(store);
  };

  createFirstButton?.addEventListener("click", handleStartCreate);
  createNewButton?.addEventListener("click", handleStartCreate);

  // Event delegation for cards
  list?.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      ".shared-expense-card"
    );
    if (!card) return;
    const expenseId = card.getAttribute("data-expense-id");
    if (!expenseId) return;

    if (card.dataset.pendingInvite === "true") {
      state.setPendingInviteSeId(expenseId);
      state.setCurrentView("invite-detail", store);
    } else {
      handleSelectSharedExpense(expenseId, card);
    }
  });
}
