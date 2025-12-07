# 🏗️ Guía de Arquitectura - SplitExpenses

## Separación de Responsabilidades

### 1. **AppState** (Estado de UI - Efímero)

**Ubicación:** `src/state/AppState.ts`

**Responsabilidades:**

- ✅ Vista actual (`currentView`)
- ✅ Paso del wizard (`createStep`)
- ✅ Datos temporales del formulario (`newSharedExpenseData`)
- ✅ Notificar cambios a la función `render()`

**NO persiste en localStorage** - Se resetea al recargar la página.

```typescript
// AppState solo maneja UI temporal
const state = new AppState();
state.setCurrentView("dashboard", store);
state.goToNextStep(store);
state.updateNewSharedExpenseData({ name: "Vacaciones" });
```

---

### 2. **AppStore** (Estado de Aplicación + Datos)

**Ubicación:** `src/store.ts`

**Responsabilidades:**

- ✅ Datos reales: `participants`, `expenses`, `payments`, `sharedExpenses`
- ✅ Interacción con Firebase/IndexedDB
- ✅ `currentSharedExpenseId` (último gasto compartido activo)
- ✅ Operaciones CRUD

**Persistencia:**

- **Principal:** Firebase/IndexedDB (datos completos)
- **Opcional:** localStorage para `currentSharedExpenseId` (cache)

```typescript
// AppStore maneja datos reales
export default class AppStore {
  private currentSharedExpenseId: string | null = null;

  constructor(state: AppState) {
    this.state = state;
    this.loadFromStorage(); // Carga desde Firebase
    this.loadLastActiveFromCache(); // Opcional: cache de localStorage
  }

  // Guardar último gasto compartido activo en cache
  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;
    if (id) {
      localStorage.setItem("last_shared_expense_id", id);
    } else {
      localStorage.removeItem("last_shared_expense_id");
    }
  }

  // Cargar desde cache (opcional)
  private loadLastActiveFromCache(): void {
    const cachedId = localStorage.getItem("last_shared_expense_id");
    if (cachedId && this.getSharedExpense(cachedId)) {
      this.currentSharedExpenseId = cachedId;
    }
  }
}
```

---

### 3. **Componentes** (UI Modular)

**Patrón:** Inspirado en `setupCounter`

**Estructura:**

```typescript
// 1. Función de renderizado (retorna HTML string)
export default function renderMyComponent(
  state: AppState,
  store: AppStore
): string {
  return `<div id="my-component">...</div>`;
}

// 2. Función de setup (maneja eventos e interacciones)
export function setupMyComponent(
  element: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // Referencias al DOM
  const button = element.querySelector("#my-button");

  // Handlers
  const handleClick = () => {
    state.setCurrentView("dashboard", store);
  };

  // Event listeners
  button?.addEventListener("click", handleClick);
}
```

**Componentes siempre reciben:**

- `state: AppState` → Para leer/actualizar UI
- `store: AppStore` → Para leer/actualizar datos

---

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                      Usuario Interactúa                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              setupComponent (Event Handler)              │
│  - Captura evento                                        │
│  - Actualiza state.setCurrentView() o store.addExpense()│
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         AppState o AppStore notifica cambio              │
│  - state.notify(store) → llama render()                  │
│  - store.saveToFirebase() → persiste datos              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              render(state, store) se ejecuta             │
│  1. Limpia el DOM                                        │
│  2. Renderiza HTML nuevo                                 │
│  3. Llama setupViewInteractions()                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│          setupViewInteractions() configura eventos       │
│  - Encuentra elementos del DOM                           │
│  - Adjunta event listeners                               │
└─────────────────────────────────────────────────────────┘
```

---

## Ejemplo Completo: CreateStep1

### 1. **Render Function** (`renderCreateStep1.ts`)

```typescript
export default function renderCreateStep1(state: AppState): string {
  const data = state.getNewSharedExpenseData();

  return `
    <div>
      <form id="create-step-1-form">
        <input 
          type="text" 
          name="name" 
          value="${data.name}"
          id="shared-expense-name"
        >
        <button type="submit">Continuar</button>
      </form>
    </div>
  `;
}
```

### 2. **Setup Function**

```typescript
export function setupCreateStep1(
  form: HTMLFormElement,
  state: AppState,
  store: AppStore
): void {
  const nameInput = form.querySelector<HTMLInputElement>(
    "#shared-expense-name"
  );

  // Handler: Actualizar nombre en tiempo real
  const handleNameChange = (name: string) => {
    state.setNewSharedExpenseName(name);
    // NO notificamos aquí para evitar re-render en cada tecla
  };

  // Handler: Ir al paso 2
  const handleSubmit = (e: Event) => {
    e.preventDefault();

    // Capturar todos los datos del form
    const formData = new FormData(form);
    state.updateNewSharedExpenseData({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "unique" | "recurring",
    });

    // Avanzar al siguiente paso (esto SÍ notifica)
    state.goToNextStep(store);
  };

  // Event listeners
  nameInput?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    handleNameChange(target.value);
  });

  form.addEventListener("submit", handleSubmit);
}
```

### 3. **En render.ts**

```typescript
function setupViewInteractions(
  view: string,
  state: AppState,
  store: AppStore
): void {
  if (view === "create-step-1") {
    const form = document.querySelector<HTMLFormElement>("#create-step-1-form");
    if (form) {
      setupCreateStep1(form, state, store);
    }
  }
}
```

---

## ¿Dónde va localStorage?

### ✅ **En AppStore** (Opcional - Solo Cache)

```typescript
class AppStore {
  // Cache del último gasto compartido activo
  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;
    localStorage.setItem("last_active_expense", id || "");
  }

  // Cargar cache al iniciar
  private loadCache(): void {
    const cachedId = localStorage.getItem("last_active_expense");
    if (cachedId) this.currentSharedExpenseId = cachedId;
  }
}
```

### ❌ **NO en AppState**

AppState es efímero y no debería persistir.

---

## Ventajas de esta Arquitectura

### ✅ **Separación Clara**

- UI (AppState) separada de Datos (AppStore)
- Componentes reutilizables y testables

### ✅ **Un Solo Flujo de Datos**

- `state.setCurrentView()` → notifica → `render()` → `setup()`
- Predecible y fácil de debuggear

### ✅ **Componentes Modulares**

```typescript
// Cada componente tiene:
export default function render...() // HTML
export function setup...()          // Interacciones
```

### ✅ **Type-Safe**

TypeScript garantiza que `state` y `store` tengan los tipos correctos

---

## Checklist de Implementación

- [ ] AppState maneja solo UI (vista, paso, datos temporales)
- [ ] AppStore maneja datos reales + Firebase
- [ ] localStorage solo para cache opcional (ej: último gasto activo)
- [ ] Todos los componentes reciben `state` y `store`
- [ ] Cada componente tiene `render()` y `setup()`
- [ ] `setup()` se llama en `setupViewInteractions()`
- [ ] Solo `state.setCurrentView()` o cambios en store activan `render()`

---

## Recursos

- **Patrón setupCounter:** Vite template vanilla-ts
- **Observer Pattern:** Para notificaciones de cambio
- **Single Source of Truth:** AppState para UI, AppStore para datos
