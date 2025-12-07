# 🚀 Quick Reference - Patrón de Componentes

## Template para Crear Componentes

### 1️⃣ Estructura Básica

```typescript
// src/components/myComponent/myComponent.ts

import type AppState from "../../state/AppState";
import type AppStore from "../../store";

// ============== RENDER ==============
export default function renderMyComponent(
  state: AppState,
  store: AppStore
): string {
  // Obtener datos necesarios
  const data = state.getSomeData();
  const items = store.getSomeItems();

  return `
    <div id="my-component">
      <button id="my-button">Click me</button>
      <input id="my-input" value="${data}" />
    </div>
  `;
}

// ============== SETUP ==============
export function setupMyComponent(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // 1. Referencias al DOM
  const button = container.querySelector<HTMLButtonElement>("#my-button");
  const input = container.querySelector<HTMLInputElement>("#my-input");

  // 2. Handlers (funciones puras)
  const handleClick = () => {
    state.setCurrentView("other-view", store);
  };

  const handleInput = (value: string) => {
    state.updateSomeData(value);
    // NO llamar render() aquí
  };

  // 3. Event Listeners
  button?.addEventListener("click", handleClick);
  input?.addEventListener("input", (e) => {
    handleInput((e.target as HTMLInputElement).value);
  });
}
```

---

## 2️⃣ Registrar en render.ts

```typescript
// src/render.ts

import renderMyComponent, {
  setupMyComponent,
} from "./components/myComponent/myComponent";

function renderViewContent(
  view: string,
  state: AppState,
  store: AppStore
): string {
  switch (view) {
    case "my-view":
      return renderMyComponent(state, store);
    // ... otros casos
  }
}

function setupViewInteractions(
  view: string,
  state: AppState,
  store: AppStore
): void {
  if (view === "my-view") {
    const container = document.querySelector<HTMLElement>("#my-component");
    if (container) {
      setupMyComponent(container, state, store);
    }
  }
}
```

---

## 3️⃣ Cuándo usar AppState vs AppStore

### 🎨 Usar `state` cuando:

```typescript
// ✅ Cambiar vista
state.setCurrentView("dashboard", store);

// ✅ Navegar en wizard
state.goToNextStep(store);

// ✅ Datos temporales de formulario
state.updateNewSharedExpenseData({ name: "Vacaciones" });

// ✅ Validaciones de UI
if (state.canProceedToStep2()) {
  state.goToNextStep(store);
}
```

### 💾 Usar `store` cuando:

```typescript
// ✅ CRUD de datos reales
await store.addExpense(expense, "dashboard");
await store.deletePayment(id, "history");

// ✅ Obtener datos persistentes
const participants = store.getParticipants();
const expense = store.getSharedExpense(id);

// ✅ Cambiar gasto compartido activo
store.setCurrentSharedExpenseId(id); // Cache en localStorage
```

---

## 4️⃣ Patrón de Formularios

```typescript
export function setupMyForm(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    // 1. Capturar datos del form
    const formData = new FormData(form);
    const data = {
      name: formData.get("name") as string,
      amount: parseFloat(formData.get("amount") as string),
    };

    // 2. Validar
    if (!data.name) {
      alert("El nombre es requerido");
      return;
    }

    // 3. Guardar en store (async)
    try {
      await store.addExpense(
        {
          ...data,
          id: "",
          sharedExpenseId: store.getCurrentSharedExpenseId()!,
          date: new Date().toISOString(),
        },
        "dashboard"
      );
      // El store ya llamó a render() después de guardar
    } catch (error) {
      alert("Error al guardar");
    }
  };

  form.addEventListener("submit", handleSubmit);
}
```

---

## 5️⃣ Patrón de Listas Interactivas

```typescript
export function setupMyList(
  list: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // Event delegation para elementos dinámicos
  list.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Botón de eliminar
    if (target.matches(".delete-btn")) {
      const id = target.dataset.id;
      if (id && confirm("¿Eliminar?")) {
        store.deleteExpense(id, "history");
      }
    }

    // Item clickeable
    if (target.matches(".list-item")) {
      const id = target.dataset.id;
      if (id) {
        store.setCurrentSharedExpenseId(id);
        state.setCurrentView("dashboard", store);
      }
    }
  });
}
```

---

## 6️⃣ Patrón de Botones con Loading

```typescript
export function setupCreateButton(
  button: HTMLButtonElement,
  state: AppState,
  store: AppStore
): void {
  const buttonText = button.querySelector(".button-text");
  const buttonLoading = button.querySelector(".button-loading");

  const handleCreate = async () => {
    // 1. Deshabilitar y mostrar loading
    button.disabled = true;
    buttonText?.classList.add("hidden");
    buttonLoading?.classList.remove("hidden");

    try {
      // 2. Crear recurso
      const data = state.getNewSharedExpenseData();
      await store.createSharedExpense({
        ...data,
        id: "",
        status: "active",
        createdAt: new Date().toISOString(),
      });

      // 3. Limpiar y navegar
      state.resetNewSharedExpenseData();
      state.goToDashboard(store);
    } catch (error) {
      // 4. Manejar error
      alert("Error al crear");

      // 5. Restaurar botón
      button.disabled = false;
      buttonText?.classList.remove("hidden");
      buttonLoading?.classList.add("hidden");
    }
  };

  button.addEventListener("click", handleCreate);
}
```

---

## 7️⃣ Patrón de Inputs en Tiempo Real

```typescript
export function setupNameInput(
  input: HTMLInputElement,
  state: AppState,
  store: AppStore
): void {
  // Debounce helper (opcional)
  let timeout: number;

  const handleChange = (value: string) => {
    // Actualizar estado sin re-render
    state.setNewSharedExpenseName(value);

    // Opcional: validar y mostrar feedback
    const isValid = value.trim().length > 0;
    input.classList.toggle("border-red-500", !isValid);
  };

  input.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;

    // Opcional: debounce
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      handleChange(value);
    }, 300);
  });
}
```

---

## 8️⃣ Reglas de Oro

### ✅ DO

- Siempre pasar `state` y `store` a componentes
- Handlers son funciones puras (sin side effects directos)
- `state.setCurrentView()` siempre activa `render()`
- `store.add*()` o `store.delete*()` siempre son async
- localStorage solo en `AppStore` para cache

### ❌ DON'T

- NO llamar `render()` manualmente desde componentes
- NO guardar estado en variables globales
- NO usar localStorage en componentes o `AppState`
- NO mezclar lógica de UI con lógica de datos
- NO re-renderizar en cada tecla (usar debounce)

---

## 9️⃣ Debugging

```typescript
// En cualquier handler:
console.log('State:', state.getState());
console.log('Current view:', state.getCurrentView());
console.log('Current expense:', store.getCurrentSharedExpenseId());

// En AppState:
getState() {
  return {
    currentView: this.currentView,
    createStep: this.createStep,
    newSharedExpenseData: this.newSharedExpenseData
  };
}
```

---

## 🔟 Checklist por Componente

- [ ] Archivo `renderMyComponent.ts` en carpeta apropiada
- [ ] Función `renderMyComponent(state, store): string`
- [ ] Función `setupMyComponent(element, state, store): void`
- [ ] Registrado en `renderViewContent()` en `render.ts`
- [ ] Registrado en `setupViewInteractions()` en `render.ts`
- [ ] Handlers usan `state.set*()` o `store.*()` según corresponda
- [ ] Solo `state.setCurrentView()` activa re-render
- [ ] Operaciones async usan `await store.*()` con try/catch
