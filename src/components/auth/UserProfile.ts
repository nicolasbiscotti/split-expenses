import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Perfil del usuario
 */
export default function renderUserProfile(
  _state: AppState,
  store: AppStore
): string {
  const user = store.getCurrentUser();

  if (!user) {
    return '<div class="p-4 text-center">No se encontró el usuario</div>';
  }

  const sharedExpenses = store.getSharedExpenses();
  const asAdmin = sharedExpenses.filter((se) =>
    se.administrators.includes(user.uid)
  );
  const asParticipant = sharedExpenses.filter(
    (se) =>
      se.participants.includes(user.uid) &&
      !se.administrators.includes(user.uid)
  );

  return `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center gap-4 mb-6">
          ${
            user.photoURL
              ? `
            <img 
              src="${user.photoURL}" 
              alt="${user.displayName}"
              class="w-20 h-20 rounded-full border-4 border-blue-100"
            />
          `
              : `
            <div class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-100">
              ${user.displayName.charAt(0).toUpperCase()}
            </div>
          `
          }
          
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-800">${
              user.displayName
            }</h1>
            <p class="text-gray-600">${user.email}</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 pt-4 border-t">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600">${
              sharedExpenses.length
            }</p>
            <p class="text-sm text-gray-600">Gastos Totales</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600">${asAdmin.length}</p>
            <p class="text-sm text-gray-600">Como Admin</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">${
              asParticipant.length
            }</p>
            <p class="text-sm text-gray-600">Como Participante</p>
          </div>
        </div>
      </div>

      <!-- Información de la cuenta -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Información de la Cuenta</h2>
        
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">Miembro desde</span>
            <span class="font-medium">${new Date(
              user.createdAt
            ).toLocaleDateString()}</span>
          </div>
          
          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">Último acceso</span>
            <span class="font-medium">${new Date(
              user.lastLoginAt
            ).toLocaleDateString()}</span>
          </div>
          
          <div class="flex justify-between items-center py-2">
            <span class="text-gray-600">ID de usuario</span>
            <span class="font-mono text-xs text-gray-500">${user.uid.substring(
              0,
              8
            )}...</span>
          </div>
        </div>
      </div>

      <!-- Gastos Compartidos Activos -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Gastos Compartidos Activos</h2>
        
        ${
          sharedExpenses.filter((se) => se.status === "active").length === 0
            ? '<p class="text-gray-500 text-center py-4">No tienes gastos compartidos activos</p>'
            : `
            <div class="space-y-2">
              ${sharedExpenses
                .filter((se) => se.status === "active")
                .map((se) => {
                  const isAdmin = se.administrators.includes(user.uid);
                  return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition cursor-pointer"
                         onclick="selectSharedExpense('${se.id}')">
                      <div>
                        <p class="font-medium">${se.name}</p>
                        <p class="text-xs text-gray-500">${
                          se.participants.length
                        } participantes</p>
                      </div>
                      <span class="px-2 py-1 text-xs rounded ${
                        isAdmin
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-200 text-gray-700"
                      }">
                        ${isAdmin ? "Admin" : "Participante"}
                      </span>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
        }
      </div>

      <!-- Acciones -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Acciones</h2>
        
        <div class="space-y-2">
          <button
            onclick="setView('shared-expense-list')"
            class="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-3"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>Ver Mis Gastos</span>
          </button>

          <button
            id="logout-from-profile-btn"
            class="w-full text-left px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition flex items-center gap-3"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 * Setup: Maneja las interacciones del perfil
 */
export function setupUserProfile(
  container: HTMLElement,
  _state: AppState,
  store: AppStore
): void {
  const logoutButton = container.querySelector("#logout-from-profile-btn");

  // Handler: Cerrar sesión
  const handleLogout = async () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
      try {
        await store.signOut();
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("Error al cerrar sesión. Intenta de nuevo.");
      }
    }
  };

  // Event listeners
  logoutButton?.addEventListener("click", handleLogout);
}
