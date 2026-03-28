import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import type { SharedExpenseParticipant } from "../../types";
import { showToast } from "../../util/toast";

/**
 * Render: Step 2 of the wizard - participant selection
 */
export default function renderCreateStep2(
  state: AppState,
  store: AppStore
): string {
  const currentUser = store.getCurrentUser()!;
  const contacts = store.getContacts();
  const selectedParticipants = state.getNewSharedExpenseData().participants;
  const selectedEmails = selectedParticipants.map((p) => p.email);
  const selectedCount = selectedParticipants.length;

  const contactsHtml =
    contacts.length > 0
      ? `
      <div class="space-y-2 mb-4">
        ${contacts
          .map((c) => {
            const isSelected = selectedEmails.includes(c.email);
            return `
            <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 ${
              isSelected ? "bg-blue-50 border-blue-300" : ""
            }">
              <input
                type="checkbox"
                class="participant-checkbox w-5 h-5"
                data-email="${c.email}"
                data-name="${c.displayName !== c.email ? c.displayName : c.email}"
                data-uid="${c.uid ?? ""}"
                ${isSelected ? "checked" : ""}
              >
              <div>
                <p class="font-medium text-sm">${c.displayName !== c.email ? c.displayName : c.email}</p>
                ${c.displayName !== c.email ? `<p class="text-xs text-gray-500">${c.email}</p>` : ""}
              </div>
            </label>
          `;
          })
          .join("")}
      </div>
    `
      : "";

  return `
    <div class="mb-6">
      <button id="back-to-step-1" class="text-blue-600 flex items-center gap-1 mb-4">
        ← Volver
      </button>
      <h1 class="text-2xl font-bold text-gray-800">Crear Gasto Compartido</h1>
      <p class="text-gray-600">Paso 2 de 3: Selecciona participantes</p>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-semibold">Participantes</h3>
        <span class="text-sm ${selectedCount >= 2 ? "text-green-600" : "text-red-600"}">
          ${selectedCount} / mínimo 2
        </span>
      </div>

      <!-- Zone 1: Current user (always selected, cannot deselect) -->
      <div class="flex items-center gap-3 p-3 border rounded bg-blue-50 border-blue-300 mb-4">
        <input type="checkbox" checked disabled class="w-5 h-5">
        <div>
          <p class="font-medium text-sm">${currentUser.displayName}</p>
          <p class="text-xs text-gray-500">${currentUser.email} · Tú</p>
        </div>
      </div>

      <!-- Zone 2: Contacts list -->
      ${
        contacts.length === 0
          ? `<p class="text-sm text-gray-500 mb-4">Todavía no tienes contactos. Agrega a alguien abajo para incluirlo.</p>`
          : contactsHtml
      }

      <!-- Zone 3: Add by email -->
      <div class="border-t pt-4">
        <p class="text-sm font-medium text-gray-700 mb-2">Agregar por email</p>
        <form id="add-participant-by-email" class="flex gap-2">
          <input
            type="email"
            id="new-participant-email"
            placeholder="email@ejemplo.com"
            class="flex-1 p-2 border rounded text-sm"
          >
          <button
            type="submit"
            class="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
          >
            Agregar
          </button>
        </form>
      </div>
    </div>

    <button
      id="continue-to-step-3"
      ${selectedCount < 2 ? "disabled" : ""}
      class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      Continuar
    </button>
  `;
}

/**
 * Setup: handles participant selection and add-by-email
 */
export function setupCreateStep2(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const backButton = container.querySelector<HTMLButtonElement>("#back-to-step-1");
  const continueButton = container.querySelector<HTMLButtonElement>("#continue-to-step-3");
  const checkboxes = container.querySelectorAll<HTMLInputElement>(".participant-checkbox");
  const addByEmailForm = container.querySelector<HTMLFormElement>("#add-participant-by-email");
  const emailInput = container.querySelector<HTMLInputElement>("#new-participant-email");

  backButton?.addEventListener("click", () => state.goToPreviousStep(store));

  continueButton?.addEventListener("click", () => {
    if (state.canProceedToStep3()) {
      state.goToNextStep(store);
    } else {
      alert("Debes seleccionar al menos 2 participantes");
    }
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const participant: SharedExpenseParticipant = {
        email: checkbox.dataset.email!,
        displayName: checkbox.dataset.name!,
        uid: checkbox.dataset.uid || undefined,
      };
      state.toggleParticipantInNew(participant, store);
    });
  });

  addByEmailForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim().toLowerCase();
    if (!email) return;

    const currentUser = store.getCurrentUser();
    if (currentUser && email === currentUser.email) {
      showToast("Ya eres participante de este gasto.", "error");
      return;
    }

    const submitBtn = addByEmailForm.querySelector<HTMLButtonElement>('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      // Save as contact and add to wizard participants
      await store.addContact(email);
      const participant: SharedExpenseParticipant = { email, displayName: email };
      state.addParticipantToNew(participant, store);
      if (emailInput) emailInput.value = "";
    } catch (error) {
      console.error("Failed to add participant:", error);
      showToast("Error al agregar el participante.", "error");
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
