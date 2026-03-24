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
- ✅ Interaction with Firebase/IndexedDB
- ✅ `currentSharedExpenseId` (last active shared expense)
- ✅ CRUD operations

**Persistence:**

- **Primary:** Firebase/IndexedDB (full data)
- **Optional:** localStorage for `currentSharedExpenseId` (cache)

```typescript
// AppStore handles real data
export default class AppStore {
  private currentSharedExpenseId: string | null = null;

  constructor(state: AppState) {
    this.state = state;
    this.loadFromStorage(); // Load from Firebase
    this.loadLastActiveFromCache(); // Optional: localStorage cache
  }

  // Save last active shared expense in cache
  setCurrentSharedExpenseId(id: string | null): void {
    this.currentSharedExpenseId = id;
    if (id) {
      localStorage.setItem("last_shared_expense_id", id);
    } else {
      localStorage.removeItem("last_shared_expense_id");
    }
  }

  // Load from cache (optional)
  private loadLastActiveFromCache(): void {
    const cachedId = localStorage.getItem("last_shared_expense_id");
    if (cachedId && this.getSharedExpense(cachedId)) {
      this.currentSharedExpenseId = cachedId;
    }
  }
}
```

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

```
┌─────────────────────────────────────────────────────────┐
│                      User Interacts                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              setupComponent (Event Handler)              │
│  - Captures event                                       │
│  - Updates state.setCurrentView() or store.addExpense() │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         AppState or AppStore notify change               │
│  - state.notify(store) → calls render()                  │
│  - store.saveToFirebase() → persists data                │
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
- [ ] AppStore handles real data + Firebase
- [ ] localStorage only for optional cache (e.g., last active expense)
- [ ] All components receive `state` and `store`
- [ ] Each component has `render()` and `setup()`
- [ ] `setup()` is called in `setupViewInteractions()`
- [ ] Only `state.setCurrentView()` or store changes trigger `render()`

---

## Resources

- **setupCounter Pattern:** Vite vanilla-ts template
- **Observer Pattern:** For change notifications
- **Single Source of Truth:** AppState for UI, AppStore for data
