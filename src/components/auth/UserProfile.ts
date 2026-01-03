import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Perfil del usuario con formulario para agregar contactos
 */
export default function renderUserProfile(
  _state: AppState,
  store: AppStore
): string {
  const user = store.getCurrentUser();
  const currentUserContact = store.getCurrentUserContact();
  const userContacts = store.getContacts();

  if (!user) {
    return '<div class="p-4 text-center">No se encontró el usuario</div>';
  }

  const sharedExpenses = store.getSharedExpenses();
  const asAdmin = sharedExpenses.filter((se) =>
    se.adminContactIds.includes(currentUserContact!.id)
  );
  const asParticipant = sharedExpenses.filter(
    (se) =>
      se.participantContactIds.includes(currentUserContact!.id) &&
      !se.adminContactIds.includes(currentUserContact!.id)
  );

  // Filter out current user from contacts list
  const otherContacts = userContacts.filter(
    (c) => c.id !== currentUserContact?.id
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

      <!-- Mis Contactos -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Mis Contactos</h2>
          <span class="text-sm text-gray-500">${otherContacts.length} contacto${
    otherContacts.length !== 1 ? "s" : ""
  }</span>
        </div>

        <!-- Add Contact Form -->
        <div class="mb-4">
          <button 
            id="toggle-add-contact-profile"
            class="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>Agregar Nuevo Contacto</span>
          </button>
          
          <!-- Collapsible form -->
          <div id="add-contact-form-profile" class="hidden mt-4 p-4 bg-gray-50 rounded-lg">
            <form id="contact-form-profile" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input 
                  type="email" 
                  id="profile-contact-email"
                  name="email" 
                  required 
                  class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="ejemplo@gmail.com"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nombre / Alias *
                </label>
                <input 
                  type="text" 
                  id="profile-contact-name"
                  name="displayName" 
                  required 
                  class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="¿Cómo quieres llamar a esta persona?"
                >
              </div>
              
              <div class="flex gap-2">
                <button 
                  type="submit" 
                  class="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition"
                >
                  Agregar
                </button>
                <button 
                  type="button" 
                  id="cancel-add-contact-profile"
                  class="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-medium hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
            
            <!-- Loading state -->
            <div id="add-contact-loading-profile" class="hidden text-center py-4">
              <svg class="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-sm text-gray-600 mt-2">Agregando contacto...</p>
            </div>
            
            <!-- Error message -->
            <div id="add-contact-error-profile" class="hidden mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p class="text-sm text-red-700"></p>
            </div>
            
            <!-- Success message -->
            <div id="add-contact-success-profile" class="hidden mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p class="text-sm text-green-700"></p>
            </div>
          </div>
        </div>

        <!-- Contacts List -->
        ${
          otherContacts.length === 0
            ? '<p class="text-gray-500 text-center py-4">No tienes contactos aún. ¡Agrega uno!</p>'
            : `
            <div class="space-y-2 max-h-64 overflow-y-auto">
              ${otherContacts
                .map(
                  (contact) => `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    ${contact.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">${contact.displayName}</p>
                    <p class="text-sm text-gray-500 truncate">${
                      contact.email
                    }</p>
                  </div>
                  ${
                    contact.hasAccount
                      ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Con cuenta</span>'
                      : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Sin cuenta</span>'
                  }
                </div>
              `
                )
                .join("")}
            </div>
          `
        }
      </div>

      <!-- Información de la cuenta -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Información de la Cuenta</h2>
        
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">Miembro desde</span>
            <span class="font-medium">${new Date(
              user.createdAt
            ).toLocaleDateString("es-AR")}</span>
          </div>
          
          <div class="flex justify-between items-center py-2 border-b">
            <span class="text-gray-600">Último acceso</span>
            <span class="font-medium">${new Date(
              user.lastLoginAt
            ).toLocaleDateString("es-AR")}</span>
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
                  const isAdmin = se.adminContactIds.includes(
                    currentUserContact!.id
                  );
                  return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition cursor-pointer"
                         onclick="selectSharedExpense('${se.id}')">
                      <div>
                        <p class="font-medium">${se.name}</p>
                        <p class="text-xs text-gray-500">${
                          se.participantContactIds.length
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
  const toggleFormButton = container.querySelector(
    "#toggle-add-contact-profile"
  );
  const formContainer = container.querySelector("#add-contact-form-profile");
  const contactForm = container.querySelector<HTMLFormElement>(
    "#contact-form-profile"
  );
  const cancelButton = container.querySelector("#cancel-add-contact-profile");
  const loadingDiv = container.querySelector("#add-contact-loading-profile");
  const errorDiv = container.querySelector("#add-contact-error-profile");
  const successDiv = container.querySelector("#add-contact-success-profile");

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

  // Handler: Toggle add contact form
  const toggleAddContactForm = () => {
    formContainer?.classList.toggle("hidden");
    errorDiv?.classList.add("hidden");
    successDiv?.classList.add("hidden");
    if (!formContainer?.classList.contains("hidden")) {
      container
        .querySelector<HTMLInputElement>("#profile-contact-email")
        ?.focus();
    }
  };

  // Handler: Cancel add contact
  const cancelAddContact = () => {
    formContainer?.classList.add("hidden");
    contactForm?.reset();
    errorDiv?.classList.add("hidden");
    successDiv?.classList.add("hidden");
  };

  // Handler: Submit new contact
  const handleAddContact = async (e: Event) => {
    e.preventDefault();

    const emailInput = container.querySelector<HTMLInputElement>(
      "#profile-contact-email"
    );
    const nameInput = container.querySelector<HTMLInputElement>(
      "#profile-contact-name"
    );

    if (!emailInput || !nameInput) return;

    const email = emailInput.value.trim();
    const displayName = nameInput.value.trim();

    if (!email || !displayName) {
      showError("Por favor completa todos los campos");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Por favor ingresa un email válido");
      return;
    }

    // Check if contact already exists in user's list
    const existingContact = store
      .getContacts()
      .find((c) => c.email.toLowerCase() === email.toLowerCase());

    if (existingContact) {
      showError("Ya tienes un contacto con este email");
      return;
    }

    // Show loading
    contactForm?.classList.add("hidden");
    loadingDiv?.classList.remove("hidden");
    errorDiv?.classList.add("hidden");
    successDiv?.classList.add("hidden");

    try {
      await store.addContact(email, displayName);

      // Show success
      showSuccess(`¡${displayName} agregado exitosamente!`);
      contactForm?.reset();

      // Re-render after a short delay to show the new contact
      setTimeout(() => {
        // Trigger re-render by setting the view again
        _state.setCurrentView("user-profile", store);
      }, 1500);
    } catch (error: any) {
      console.error("Error adding contact:", error);
      showError(error.message || "Error al agregar el contacto");
      contactForm?.classList.remove("hidden");
    } finally {
      loadingDiv?.classList.add("hidden");
    }
  };

  // Helper: Show error message
  const showError = (message: string) => {
    const errorText = errorDiv?.querySelector("p");
    if (errorText) {
      errorText.textContent = message;
    }
    errorDiv?.classList.remove("hidden");
    successDiv?.classList.add("hidden");
  };

  // Helper: Show success message
  const showSuccess = (message: string) => {
    const successText = successDiv?.querySelector("p");
    if (successText) {
      successText.textContent = message;
    }
    successDiv?.classList.remove("hidden");
    errorDiv?.classList.add("hidden");
  };

  // Event listeners
  logoutButton?.addEventListener("click", handleLogout);
  toggleFormButton?.addEventListener("click", toggleAddContactForm);
  cancelButton?.addEventListener("click", cancelAddContact);
  contactForm?.addEventListener("submit", handleAddContact);
}
