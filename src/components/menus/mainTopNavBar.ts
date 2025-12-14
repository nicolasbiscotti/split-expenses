import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { User } from "../../types";

/**
 * Render: Barra de navegación superior
 * Se muestra en todas las vistas excepto login
 */
export default function renderMainTopNavBar(
  state: AppState,
  store: AppStore
): string {
  const currentView = state.getCurrentView();
  const currentUser = store.getCurrentUser();

  if (!currentUser || currentView === "login") {
    return "";
  }

  // Determinar si mostrar botón "Volver"
  const showBackButton = shouldShowBackButton(currentView);

  return `
    <nav class="bg-white border-b shadow-sm sticky top-0 z-50">
      <div class="max-w-lg mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          
          <!-- Lado izquierdo: Logo/Título o Botón Volver -->
          <div class="flex items-center gap-3">
            ${showBackButton ? renderBackButton() : renderLogo()}
          </div>

          <!-- Lado derecho: Usuario y menú -->
          <div class="flex items-center gap-3">
            ${renderUserMenu(currentUser)}
          </div>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render: Logo y título (para shared-expense-list)
 */
function renderLogo(): string {
  return `
    <div class="flex items-center gap-2">
      <span class="text-2xl">💰</span>
      <span class="font-bold text-gray-800 text-lg">SplitExpenses</span>
    </div>
  `;
}

/**
 * Render: Botón volver (para otras vistas)
 */
function renderBackButton(): string {
  return `
    <button 
      id="back-to-list-btn"
      class="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      <span class="hidden sm:inline">Mis Gastos</span>
    </button>
  `;
}

/**
 * Render: Menú de usuario
 */
function renderUserMenu(user: User): string {
  return `
    <div class="relative">
      <!-- Botón del usuario -->
      <button 
        id="user-menu-button"
        class="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition"
        aria-expanded="false"
      >
        ${
          user.photoURL
            ? `
          <img 
            src="${user.photoURL}" 
            alt="${user.displayName}"
            class="w-8 h-8 rounded-full border-2 border-gray-200"
          />
        `
            : `
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-gray-200">
            ${user.displayName.charAt(0).toUpperCase()}
          </div>
        `
        }
        
        <!-- Nombre (oculto en móvil) -->
        <span class="hidden sm:block font-medium text-gray-700 max-w-32 truncate">
          ${user.displayName}
        </span>
        
        <!-- Icono flecha -->
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Dropdown Menu (oculto por defecto) -->
      <div 
        id="user-menu-dropdown"
        class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
      >
        <!-- Info del usuario -->
        <div class="px-4 py-3 border-b border-gray-100">
          <p class="text-sm font-medium text-gray-900">${user.displayName}</p>
          <p class="text-xs text-gray-500 truncate">${user.email}</p>
        </div>

        <!-- Opciones del menú -->
        <div class="py-1">
          <!-- Perfil -->
          <button
            id="view-profile-btn"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span>Mi Perfil</span>
          </button>

          <!-- Mis Gastos (solo si no está en la lista) -->
          <button
            id="my-expenses-btn"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>Mis Gastos</span>
          </button>

          <!-- Divider -->
          <div class="border-t border-gray-100 my-1"></div>

          <!-- Cerrar Sesión -->
          <button
            id="logout-btn"
            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
          >
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Determinar si mostrar botón "Volver"
 */
function shouldShowBackButton(currentView: string): boolean {
  const viewsWithBackButton = [
    "dashboard",
    "add-expense",
    "add-payment",
    "history",
    "manage-participants",
    "user-profile",
    "create-step-1",
    "create-step-2",
    "create-step-3",
  ];

  return viewsWithBackButton.includes(currentView);
}

/**
 * Setup: Maneja las interacciones del navbar
 */
export function setupMainTopNavBar(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const userMenuButton = container.querySelector("#user-menu-button");
  const userMenuDropdown = container.querySelector("#user-menu-dropdown");
  const backButton = container.querySelector("#back-to-list-btn");
  const logoutButton = container.querySelector("#logout-btn");
  const viewProfileButton = container.querySelector("#view-profile-btn");
  const myExpensesButton = container.querySelector("#my-expenses-btn");

  // Handler: Toggle del menú desplegable
  const toggleUserMenu = (e: Event) => {
    e.stopPropagation();
    userMenuDropdown?.classList.toggle("hidden");

    // Actualizar aria-expanded
    const isExpanded = !userMenuDropdown?.classList.contains("hidden");
    userMenuButton?.setAttribute("aria-expanded", isExpanded.toString());
  };

  // Handler: Cerrar menú al hacer click fuera
  const closeMenuOnClickOutside = (e: Event) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest("#user-menu-button") &&
      !target.closest("#user-menu-dropdown")
    ) {
      userMenuDropdown?.classList.add("hidden");
      userMenuButton?.setAttribute("aria-expanded", "false");
    }
  };

  // Handler: Cerrar sesión
  const handleLogout = async () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      try {
        await store.signOut();
        // El onAuthStateChange en main.ts se encargará de redirigir a login
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("Error al cerrar sesión. Intenta de nuevo.");
      }
    }
  };

  // Handler: Volver a la lista
  const handleBackToList = () => {
    state.goToList(store);
  };

  // Handler: Ver perfil
  const handleViewProfile = () => {
    userMenuDropdown?.classList.add("hidden");
    state.setCurrentView("user-profile", store);
  };

  // Handler: Ir a Mis Gastos
  const handleMyExpenses = () => {
    userMenuDropdown?.classList.add("hidden");
    state.goToList(store);
  };

  // Event listeners
  userMenuButton?.addEventListener("click", toggleUserMenu);
  document.addEventListener("click", closeMenuOnClickOutside);

  logoutButton?.addEventListener("click", handleLogout);
  backButton?.addEventListener("click", handleBackToList);
  viewProfileButton?.addEventListener("click", handleViewProfile);
  myExpensesButton?.addEventListener("click", handleMyExpenses);

  // Cerrar menú con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      userMenuDropdown?.classList.add("hidden");
      userMenuButton?.setAttribute("aria-expanded", "false");
    }
  });
}
