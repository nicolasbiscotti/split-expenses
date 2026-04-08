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
- ✅ Interacción con Firebase mediante listeners `onSnapshot` y llamadas a servicios
- ✅ `currentSharedExpenseId` (último gasto compartido activo, en caché en localStorage)
- ✅ Operaciones CRUD
- ✅ Ciclo de vida de listeners — los inicia al iniciar sesión / seleccionar un SE, los detiene al cerrar sesión

**Persistencia:**

- **Principal:** Firestore via listeners `onSnapshot` (gastos, pagos, documento del SE actual, colección de SEs para invitaciones)
- **Opcional:** localStorage para `currentSharedExpenseId` (caché entre recargas)

**Gestión de listeners:**

```typescript
// AppStore gestiona los listeners de Firestore
export default class AppStore {
  private stopDataListeners: (() => void) | null = null;
  private stopInviteListener: (() => void) | null = null;

  // Llamado al iniciar sesión: inicia el listener de invitaciones de SE
  async initializeForUser(firebaseUser: User): Promise<void> { ... }

  // Llamado al seleccionar un SE: inicia listeners de gastos, pagos y documento del SE
  async setCurrentSharedExpenseId(id: string | null): Promise<void> { ... }

  // Llamado al cerrar sesión: detiene todos los listeners y limpia el estado
  clearUserData(): void {
    this.stopDataListeners?.();
    this.stopInviteListener?.();
    // ... limpiar todos los campos
  }
}
```

Los listeners llaman a `this.state.notify(this)` directamente cuando los datos de Firestore cambian, disparando un re-render sin ninguna acción del usuario.

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

Hay dos caminos que disparan un re-render: acciones del usuario y actualizaciones de listeners de Firestore.

### Camino 1 — Acción del usuario

```
┌─────────────────────────────────────────────────────────┐
│                      Usuario Interactúa                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              setupComponent (Event Handler)              │
│  - Captura evento                                        │
│  - Llama state.setCurrentView() o store.addExpense()    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         AppState o AppStore notifica cambio              │
│  - state.notify(store) → llama render()                  │
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

### Camino 2 — Actualización de listener de Firestore

```
┌─────────────────────────────────────────────────────────┐
│         Firestore onSnapshot se dispara                  │
│  (otro participante agrega gasto/pago,                   │
│   llega una invitación a un nuevo SE,                    │
│   los metadatos del SE cambian)                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         Callback del listener en AppStore se ejecuta     │
│  - Actualiza this.expenses / this.payments / this.sharedExpenses
│  - Genera notificaciones, dispara toasts                 │
│  - Llama this.state.notify(this)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              render(state, store) se ejecuta             │
│  (mismo ciclo de render que el Camino 1)                 │
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
- [ ] AppStore maneja datos reales + listeners de Firestore
- [ ] localStorage solo para cache opcional (ej: último gasto activo)
- [ ] Todos los componentes reciben `state` y `store`
- [ ] Cada componente tiene `render()` y `setup()`
- [ ] `setup()` se llama en `setupViewInteractions()`
- [ ] Los re-renders se disparan por acciones del usuario (Camino 1) o por callbacks de listeners de Firestore (Camino 2) — ambos llaman a `state.notify(store)`
- [ ] Todos los listeners `onSnapshot` se cancelan al cerrar sesión (`clearUserData`)

---

## Recursos

- **Patrón setupCounter:** Vite template vanilla-ts
- **Observer Pattern:** Para notificaciones de cambio
- **Single Source of Truth:** AppState para UI, AppStore para datos
