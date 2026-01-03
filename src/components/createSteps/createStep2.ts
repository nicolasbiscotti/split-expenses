import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Step 2 of the wizard - Select participants
 * Now includes ability to create new contacts
 */
export default function renderCreateStep2(
  state: AppState,
  store: AppStore
): string {
  const userContacts = store.getContacts();
  const data = state.getNewSharedExpenseData();
  const selectedIds = data.selectedContactIds;
  const currentUserContact = store.getCurrentUserContact();

  return `
    <div class="mb-6">
      <button 
        id="back-to-step-1" 
        class="text-blue-600 flex items-center gap-1 mb-4"
      >
        ← Volver
      </button>
      <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
      <p class="text-gray-600">Paso 2 de 3: Selecciona participantes</p>
    </div>

    <!-- Add Contact Form -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-semibold text-gray-800">Agregar Contacto</h3>
        <button 
          id="toggle-add-contact-form"
          class="text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          + Nuevo contacto
        </button>
      </div>
      
      <!-- Collapsible form -->
      <div id="add-contact-form-container" class="hidden">
        <form id="add-contact-form" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Email (Google) *
            </label>
            <input 
              type="email" 
              id="new-contact-email"
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
              id="new-contact-name"
              name="displayName" 
              required 
              class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="¿Cómo quieres llamar a esta persona?"
            >
          </div>
          
          <div class="flex gap-2">
            <button 
              type="submit" 
              id="submit-new-contact"
              class="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              Agregar
            </button>
            <button 
              type="button" 
              id="cancel-add-contact"
              class="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-medium hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
        
        <!-- Loading state -->
        <div id="add-contact-loading" class="hidden text-center py-4">
          <svg class="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-600 mt-2">Agregando contacto...</p>
        </div>
        
        <!-- Error message -->
        <div id="add-contact-error" class="hidden mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p class="text-sm text-red-700"></p>
        </div>
      </div>
    </div>

    <!-- Participants Selection -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold">Participantes seleccionados</h3>
        <span class="text-sm ${
          selectedIds.length >= 2 ? "text-green-600" : "text-red-600"
        }">
          ${selectedIds.length} / mínimo 2
        </span>
      </div>

      <div id="participants-list" class="space-y-2">
        ${
          userContacts.length === 0
            ? `
            <p class="text-gray-500 text-center py-4">
              No tienes contactos aún. Agrega uno arriba.
            </p>
          `
            : userContacts
                .map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const isCurrentUser = currentUserContact?.id === contact.id;
                  const isAdmin = state.isContactAdmin(contact.id);

                  return `
                  <div class="flex items-center gap-3 p-3 border rounded ${
                    isSelected
                      ? "bg-blue-50 border-blue-300"
                      : "hover:bg-gray-50"
                  } ${isCurrentUser ? "border-l-4 border-l-blue-500" : ""}">
                    
                    <!-- Checkbox -->
                    <input 
                      type="checkbox" 
                      ${isSelected ? "checked" : ""}
                      ${isCurrentUser ? "disabled" : ""}
                      class="participant-checkbox w-5 h-5 cursor-pointer"
                      data-contact-id="${contact.id}"
                      data-contact-email="${contact.email}"
                      data-contact-name="${contact.displayName}"
                      data-has-account="${contact.hasAccount}"
                    >
                    
                    <!-- Contact info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium truncate">${
                          contact.displayName
                        }</span>
                        ${
                          isCurrentUser
                            ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Tú</span>'
                            : ""
                        }
                        ${
                          contact.hasAccount
                            ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Cuenta activa</span>'
                            : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Sin cuenta</span>'
                        }
                      </div>
                      <p class="text-sm text-gray-500 truncate">${
                        contact.email
                      }</p>
                    </div>
                    
                    <!-- Admin toggle (only for selected non-self contacts) -->
                    ${
                      isSelected && !isCurrentUser
                        ? `
                        <button 
                          type="button"
                          class="admin-toggle-btn px-2 py-1 text-xs rounded transition ${
                            isAdmin
                              ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }"
                          data-contact-id="${contact.id}"
                        >
                          ${isAdmin ? "Admin ✓" : "Hacer admin"}
                        </button>
                      `
                        : isSelected && isCurrentUser
                        ? '<span class="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">Admin</span>'
                        : ""
                    }
                  </div>
                `;
                })
                .join("")
        }
      </div>
    </div>

    <!-- Info box for contacts without accounts -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <p class="text-sm text-yellow-800">
        <strong>💡 Tip:</strong> Puedes agregar contactos que aún no tienen cuenta. 
        Cuando creen su cuenta con ese email, automáticamente tendrán acceso al gasto compartido.
      </p>
    </div>

    <button 
      id="continue-to-step-3"
      ${selectedIds.length < 2 ? "disabled" : ""}
      class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      Continuar
    </button>
  `;
}

/**
 * Setup: Handle participant selection and contact creation
 */
export function setupCreateStep2(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // Elements
  const backButton =
    container.querySelector<HTMLButtonElement>("#back-to-step-1");
  const continueButton = container.querySelector<HTMLButtonElement>(
    "#continue-to-step-3"
  );
  const toggleFormButton = container.querySelector<HTMLButtonElement>(
    "#toggle-add-contact-form"
  );
  const formContainer = container.querySelector<HTMLDivElement>(
    "#add-contact-form-container"
  );
  const addContactForm =
    container.querySelector<HTMLFormElement>("#add-contact-form");
  const cancelAddButton = container.querySelector<HTMLButtonElement>(
    "#cancel-add-contact"
  );
  const loadingDiv = container.querySelector<HTMLDivElement>(
    "#add-contact-loading"
  );
  const errorDiv =
    container.querySelector<HTMLDivElement>("#add-contact-error");
  const participantsList =
    container.querySelector<HTMLDivElement>("#participants-list");

  // Handler: Go back to step 1
  const handleBack = () => {
    state.goToPreviousStep(store);
  };

  // Handler: Continue to step 3
  const handleContinue = () => {
    if (state.canProceedToStep3()) {
      state.goToNextStep(store);
    } else {
      alert("Debes seleccionar al menos 2 participantes");
    }
  };

  // Handler: Toggle add contact form
  const toggleAddContactForm = () => {
    formContainer?.classList.toggle("hidden");
    if (!formContainer?.classList.contains("hidden")) {
      container.querySelector<HTMLInputElement>("#new-contact-email")?.focus();
    }
  };

  // Handler: Cancel add contact
  const cancelAddContact = () => {
    formContainer?.classList.add("hidden");
    addContactForm?.reset();
    errorDiv?.classList.add("hidden");
  };

  // Handler: Submit new contact
  const handleAddContact = async (e: Event) => {
    e.preventDefault();

    const emailInput =
      container.querySelector<HTMLInputElement>("#new-contact-email");
    const nameInput =
      container.querySelector<HTMLInputElement>("#new-contact-name");

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
    addContactForm?.classList.add("hidden");
    loadingDiv?.classList.remove("hidden");
    errorDiv?.classList.add("hidden");

    try {
      // Create the contact
      const newContact = await store.addContact(email, displayName);

      // Auto-select the new contact
      state.addNewContactToSelection(newContact, store);

      // Reset form
      addContactForm?.reset();
      formContainer?.classList.add("hidden");
    } catch (error: any) {
      console.error("Error adding contact:", error);
      showError(error.message || "Error al agregar el contacto");
      addContactForm?.classList.remove("hidden");
    } finally {
      loadingDiv?.classList.add("hidden");
    }
  };

  // Handler: Toggle participant selection
  const handleParticipantToggle = (checkbox: HTMLInputElement) => {
    const contactId = checkbox.dataset.contactId;
    const contactEmail = checkbox.dataset.contactEmail;
    const contactName = checkbox.dataset.contactName;
    const hasAccount = checkbox.dataset.hasAccount === "true";

    if (!contactId) return;

    // Create a minimal contact object for the toggle
    const contact = {
      id: contactId,
      email: contactEmail || "",
      displayName: contactName || "",
      appUserId: hasAccount ? "has-account" : null,
      hasAccount,
    };

    state.toggleContactSelection(contact, store);
  };

  // Handler: Toggle admin status
  const handleAdminToggle = (button: HTMLButtonElement) => {
    const contactId = button.dataset.contactId;
    if (contactId) {
      state.toggleAdminStatus(contactId, store);
    }
  };

  // Helper: Show error message
  const showError = (message: string) => {
    const errorText = errorDiv?.querySelector("p");
    if (errorText) {
      errorText.textContent = message;
    }
    errorDiv?.classList.remove("hidden");
  };

  // Event listeners
  backButton?.addEventListener("click", handleBack);
  continueButton?.addEventListener("click", handleContinue);
  toggleFormButton?.addEventListener("click", toggleAddContactForm);
  cancelAddButton?.addEventListener("click", cancelAddContact);
  addContactForm?.addEventListener("submit", handleAddContact);

  // Event delegation for checkboxes
  participantsList?.addEventListener("change", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("participant-checkbox")) {
      handleParticipantToggle(target as HTMLInputElement);
    }
  });

  // Event delegation for admin toggle buttons
  participantsList?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("admin-toggle-btn")) {
      handleAdminToggle(target as HTMLButtonElement);
    }
  });
}
