import type { SharedExpense, UserProfile } from "../../types";

/**
 * Render: Top bar showing the active shared expense name and navigation
 */
export default function sharedExpenseTopBar(
  currentSharedExpense: SharedExpense | null | undefined,
  currentUser: UserProfile
): string {
  const name = currentSharedExpense?.name ?? "";

  const avatarHtml = currentUser.photoURL
    ? `<img src="${currentUser.photoURL}" alt="Perfil" class="w-8 h-8 rounded-full object-cover">`
    : `<div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
        ${(currentUser.displayName ?? "U")[0].toUpperCase()}
       </div>`;

  return `
    <header class="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-10">
      <div class="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
        <button
          onclick="setView('shared-expense-list')"
          class="text-blue-600 flex items-center gap-1 shrink-0"
          aria-label="Volver a Mis Gastos"
        >
          ← Mis Gastos
        </button>
        <span class="text-gray-300">|</span>
        <h1 class="font-semibold text-gray-800 truncate flex-1">${name}</h1>
        <button
          onclick="setView('profile')"
          class="shrink-0 ml-2"
          aria-label="Mi perfil"
        >
          ${avatarHtml}
        </button>
      </div>
    </header>
  `;
}
