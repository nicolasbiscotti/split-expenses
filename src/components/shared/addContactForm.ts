import { showToast } from "../../util/toast";
import { icon } from "../../util/icons";

/**
 * Render: Collapsible add-contact form (email + optional name).
 * Uses formId as a namespace so multiple instances can coexist on the same page.
 */
export function renderAddContactForm(formId: string): string {
  return `
    <div id="${formId}-wrapper">
      <button
        type="button"
        id="${formId}-toggle"
        class="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-800 transition"
      >
        ${icon("user-plus", "w-4 h-4")} Agregar contacto
      </button>

      <div id="${formId}-fields" class="hidden mt-3 space-y-2">
        <form id="${formId}-form" class="space-y-2">
          <input
            type="email"
            id="${formId}-email"
            placeholder="email@ejemplo.com"
            class="w-full p-2 border rounded text-sm"
          >
          <input
            type="text"
            id="${formId}-name"
            placeholder="Nombre (opcional)"
            class="w-full p-2 border rounded text-sm"
          >
          <div class="flex gap-2">
            <button
              type="submit"
              class="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1"
            >
              ${icon("check", "w-4 h-4")} Agregar
            </button>
            <button
              type="button"
              id="${formId}-cancel"
              class="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-1"
            >
              ${icon("x", "w-4 h-4")} Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

interface AddContactFormOptions {
  formId: string;
  currentUserEmail: string | null;
  onAdd: (email: string, displayName?: string) => Promise<void>;
}

/**
 * Setup: handles toggle, validation, submit, and collapse for the add-contact form.
 * onAdd is called with the validated email and optional displayName after store.addContact().
 * Callers use onAdd for context-specific side-effects (e.g. adding to wizard participants).
 */
export function setupAddContactForm(
  container: HTMLElement,
  options: AddContactFormOptions
): void {
  const { formId, currentUserEmail, onAdd } = options;

  const toggleBtn = container.querySelector<HTMLButtonElement>(`#${formId}-toggle`);
  const fieldsDiv = container.querySelector<HTMLElement>(`#${formId}-fields`);
  const form = container.querySelector<HTMLFormElement>(`#${formId}-form`);
  const emailInput = container.querySelector<HTMLInputElement>(`#${formId}-email`);
  const nameInput = container.querySelector<HTMLInputElement>(`#${formId}-name`);
  const cancelBtn = container.querySelector<HTMLButtonElement>(`#${formId}-cancel`);

  const open = () => {
    fieldsDiv?.classList.remove("hidden");
    toggleBtn?.classList.add("hidden");
    emailInput?.focus();
  };

  const close = () => {
    fieldsDiv?.classList.add("hidden");
    toggleBtn?.classList.remove("hidden");
    if (emailInput) emailInput.value = "";
    if (nameInput) nameInput.value = "";
  };

  toggleBtn?.addEventListener("click", open);
  cancelBtn?.addEventListener("click", close);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput?.value.trim().toLowerCase();
    if (!email) {
      showToast("Completa el email del contacto.", "error");
      return;
    }

    if (currentUserEmail && email === currentUserEmail) {
      showToast("No puedes agregarte a ti mismo como contacto.", "error");
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Agregando...";
    }

    const displayName = nameInput?.value.trim() || undefined;

    try {
      await onAdd(email, displayName);
      close();
    } catch (_error) {
      showToast("Error al agregar el contacto.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Agregar";
      }
    }
  });
}
