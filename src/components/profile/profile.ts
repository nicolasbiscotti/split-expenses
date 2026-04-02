import type AppState from "../../state/AppState";
import type AppStore from "../../store";
import { authService } from "../../firebase/auth";
import { showToast } from "../../util/toast";
import {
  renderAddContactForm,
  setupAddContactForm,
} from "../shared/addContactForm";

/**
 * Render: Profile and contacts management view
 */
export default function renderProfile(
  _state: AppState,
  store: AppStore
): string {
  const user = store.getCurrentUser();
  const contacts = store.getContacts();

  const avatarHtml = user?.photoURL
    ? `<img src="${user.photoURL}" alt="Avatar" class="w-16 h-16 rounded-full object-cover">`
    : `<div class="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
        ${(user?.displayName ?? "U")[0].toUpperCase()}
       </div>`;

  const contactsHtml =
    contacts.length === 0
      ? `<p class="text-gray-500 text-sm">Todavía no tienes contactos. Agrega uno abajo.</p>`
      : contacts
          .map(
            (c) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-sm">${c.displayName !== c.email ? c.displayName : ""}</p>
              <p class="text-xs text-gray-500">${c.email}</p>
            </div>
            <button
              class="delete-contact-btn text-red-500 hover:text-red-700 text-sm"
              data-contact-id="${c.email.replace(/[^a-zA-Z0-9]/g, "_")}"
              title="Eliminar contacto"
            >
              🗑️
            </button>
          </div>
        `
          )
          .join("");

  return `
    <div class="space-y-6">
      <button
        onclick="setView('shared-expense-list')"
        class="text-blue-600 flex items-center gap-1"
      >
        ← Mis Gastos
      </button>

      <!-- Profile section -->
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Mi Perfil</h2>
        <div class="flex items-center gap-4 mb-4">
          ${avatarHtml}
          <div>
            <p class="font-semibold text-gray-800">${user?.displayName ?? ""}</p>
            <p class="text-sm text-gray-500">${user?.email ?? ""}</p>
          </div>
        </div>
        <button
          id="sign-out-btn"
          class="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition"
        >
          Cerrar sesión
        </button>
      </div>

      <!-- Contacts section -->
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Mis Contactos</h2>
        <div id="contacts-list" class="space-y-2 mb-4">
          ${contactsHtml}
        </div>
        ${renderAddContactForm("add-contact")}
      </div>
    </div>
  `;
}

/**
 * Setup: handles sign-out and contact management
 */
export function setupProfile(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // Sign out
  container
    .querySelector<HTMLButtonElement>("#sign-out-btn")
    ?.addEventListener("click", async () => {
      try {
        await authService.signOut();
        // onAuthStateChanged in main.ts will call clearUserData and re-render landing
      } catch (_error) {
        showToast("Error al cerrar sesión.", "error");
      }
    });

  // Add contact
  setupAddContactForm(container, {
    formId: "add-contact",
    currentUserEmail: store.getCurrentUser()?.email ?? null,
    onAdd: async (email, displayName) => {
      await store.addContact(email, displayName);
      showToast("Contacto agregado");
      state.setCurrentView("profile", store);
    },
  });

  // Delete contact (event delegation)
  container
    .querySelector("#contacts-list")
    ?.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        ".delete-contact-btn"
      );
      if (!btn) return;
      const contactId = btn.dataset.contactId;
      if (!contactId) return;

      btn.disabled = true;
      btn.textContent = "⏳";
      try {
        await store.removeContact(contactId);
        showToast("Contacto eliminado");
        state.setCurrentView("profile", store);
      } catch (_error) {
        btn.disabled = false;
        btn.textContent = "🗑️";
        showToast("Error al eliminar el contacto.", "error");
      }
    });
}
