Here’s the full translation of your attached architecture guide into English, keeping the Markdown formatting intact:

---

# 🏗️ Architecture Guide - SplitExpenses

## Separation of Responsibilities

### 1. **AppState** (UI State - Ephemeral)

**Location:** `src/state/AppState.ts`

**Responsibilities:**

- ✅ Current view (`currentView`)
- ✅ Wizard step (`createStep`)
- ✅ Temporary form data (`newSharedExpenseData`)
- ✅ Notify changes to the `render()` function

**Does NOT persist in localStorage** – It resets when the page reloads.

```typescript
// AppState only handles temporary UI
const state = new AppState();
state.setCurrentView("dashboard", store);
state.goToNextStep(store);
state.updateNewSharedExpenseData({ name: "Vacation" });
```

---

### 2. **AppStore** (Application State + Data)

**Location:** `src/store.ts`

**Responsibilities:**

- ✅ Real data: `participants`, `expenses`, `payments`, `sharedExpenses`
- ✅ Interaction with Firebase via `onSnapshot` listeners and service calls
- ✅ `currentSharedExpenseId` (last active shared expense, cached in localStorage)
- ✅ CRUD operations
- ✅ Listener lifecycle — starts listeners on sign-in / SE selection, stops them on sign-out

**Persistence:**

- **Primary:** Firestore via `onSnapshot` listeners (expenses, payments, current SE document, SE collection for invites)
- **Optional:** localStorage for `currentSharedExpenseId` (cache across reloads)

**Listener management:**

```typescript
// AppStore manages Firestore listeners
export default class AppStore {
  private stopDataListeners: (() => void) | null = null;
  private stopInviteListener: (() => void) | null = null;

  // Called on sign-in: starts the SE invite listener
  async initializeForUser(firebaseUser: User): Promise<void> { ... }

  // Called when selecting an SE: starts expense, payment, and SE-doc listeners
  async setCurrentSharedExpenseId(id: string | null): Promise<void> { ... }

  // Called on sign-out: stops all listeners and clears state
  clearUserData(): void {
    this.stopDataListeners?.();
    this.stopInviteListener?.();
    // ... clear all fields
  }
}
```

Listeners call `this.state.notify(this)` directly when Firestore data changes, triggering a re-render without any user action.

---

### 3. **Components** (Modular UI)

**Pattern:** Inspired by `setupCounter`

**Structure:**

```typescript
// 1. Render function (returns HTML string)
export default function renderMyComponent(
  state: AppState,
  store: AppStore
): string {
  return `<div id="my-component">...</div>`;
}

// 2. Setup function (handles events and interactions)
export function setupMyComponent(
  element: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  // DOM references
  const button = element.querySelector("#my-button");

  // Handlers
  const handleClick = () => {
    state.setCurrentView("dashboard", store);
  };

  // Event listeners
  button?.addEventListener("click", handleClick);
}
```

**Components always receive:**

- `state: AppState` → To read/update UI
- `store: AppStore` → To read/update data

---

## Data Flow

There are two paths that trigger a re-render: user actions and Firestore listener updates.

### Path 1 — User action

```
┌─────────────────────────────────────────────────────────┐
│                      User Interacts                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              setupComponent (Event Handler)              │
│  - Captures event                                       │
│  - Calls state.setCurrentView() or store.addExpense()   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         AppState or AppStore notifies change             │
│  - state.notify(store) → calls render()                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              render(state, store) executes               │
│  1. Clears DOM                                          │
│  2. Renders new HTML                                    │
│  3. Calls setupViewInteractions()                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│          setupViewInteractions() configures events       │
│  - Finds DOM elements                                   │
│  - Attaches event listeners                             │
└─────────────────────────────────────────────────────────┘
```

### Path 2 — Firestore listener update

```
┌─────────────────────────────────────────────────────────┐
│         Firestore onSnapshot fires                       │
│  (another participant adds expense/payment,              │
│   new SE invite arrives, SE metadata changes)           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         AppStore listener callback runs                  │
│  - Updates this.expenses / this.payments / this.sharedExpenses
│  - Builds notifications, fires toasts                   │
│  - Calls this.state.notify(this)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              render(state, store) executes               │
│  (same render cycle as Path 1)                          │
└─────────────────────────────────────────────────────────┘
```

---

## Full Example: CreateStep1

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
        <button type="submit">Continue</button>
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

  // Handler: Update name in real time
  const handleNameChange = (name: string) => {
    state.setNewSharedExpenseName(name);
    // Do NOT notify here to avoid re-render on every keystroke
  };

  // Handler: Go to step 2
  const handleSubmit = (e: Event) => {
    e.preventDefault();

    // Capture all form data
    const formData = new FormData(form);
    state.updateNewSharedExpenseData({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "unique" | "recurring",
    });

    // Advance to next step (this DOES notify)
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

### 3. **In render.ts**

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

## Where does localStorage go?

### ✅ **In AppStore** (Optional - Cache Only)

```typescript
class AppStore {
  // Cache of last active shared expense
  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;
    localStorage.setItem("last_active_expense", id || "");
  }

  // Load cache at startup
  private loadCache(): void {
    const cachedId = localStorage.getItem("last_active_expense");
    if (cachedId) this.currentSharedExpenseId = cachedId;
  }
}
```

### ❌ **NOT in AppState**

AppState is ephemeral and should not persist.

---

## Advantages of this Architecture

### ✅ **Clear Separation**

- UI (AppState) separated from Data (AppStore)
- Reusable and testable components

### ✅ **Single Data Flow**

- `state.setCurrentView()` → notifies → `render()` → `setup()`
- Predictable and easy to debug

### ✅ **Modular Components**

```typescript
// Each component has:
export default function render...() // HTML
export function setup...()          // Interactions
```

### ✅ **Type-Safe**

TypeScript ensures `state` and `store` have correct types

---

## Implementation Checklist

- [ ] AppState handles only UI (view, step, temporary data)
- [ ] AppStore handles real data + Firestore listeners
- [ ] localStorage only for optional cache (e.g., last active expense)
- [ ] All components receive `state` and `store`
- [ ] Each component has `render()` and `setup()`
- [ ] `setup()` is called in `setupViewInteractions()`
- [ ] Re-renders are triggered by either user actions (Path 1) or Firestore listener callbacks (Path 2) — both call `state.notify(store)`
- [ ] All `onSnapshot` listeners are unsubscribed on sign-out (`clearUserData`)

---

## Resources

- **setupCounter Pattern:** Vite vanilla-ts template
- **Observer Pattern:** For change notifications
- **Single Source of Truth:** AppState for UI, AppStore for data
