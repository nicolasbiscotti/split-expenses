# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Vite development server
pnpm build        # TypeScript check + Vite build
pnpm preview      # Preview production build
```

No test or lint scripts are configured. TypeScript strict mode serves as the primary static check.

## Environment Setup

Copy `.env.example` to `.env` and fill in Firebase credentials. Key variables:
- `VITE_FIRESTORE_DATA_ID` — namespace for Firestore data
- `VITE_USE_FIREBASE_EMULATORS` — set to `true` to use local emulator (auto-detected on localhost)

See `technical-references-docs/configure_firebase_for_local_development.md` for emulator setup.

## Architecture

Vanilla TypeScript SPA (no framework) with Firebase/Firestore backend.

### Two-Layer State

- **`AppState`** (`src/state/AppState.ts`) — ephemeral UI state: current view, wizard step, temporary form data. Implements observer pattern; calls `subscribeRender()` on changes.
- **`AppStore`** (`src/store.ts`) — application data: participants, expenses, payments, shared expenses. Wraps Firebase service calls. Persists only `currentSharedExpenseId` in localStorage.

### Component Pattern

Each component exports two functions:
- `render(state, store)` → HTML string
- `setup(state, store)` → attaches event listeners

The central render cycle in `render.ts` calls `render()` then `setup()` after every state/store change. This is the core UI update loop — do not break this contract.

### Data Flow

```
User Action → setup() handler → state/store mutation → notify → render() → setup()
```

### Service Layer

`src/services/databaseService.ts` wraps Firestore with typed services:
- `participantService`, `expenseService`, `paymentService`, `sharedExpenseService`

Firestore document path: `environments/{dataId}/sharedExpenses/{sharedExpenseId}/expenses/{expenseId}`

Expense creation uses Firestore transactions to atomically update the shared expense's total amount.

### Routing

View-based routing via `ViewType` enum — no URL routing. Navigate with `state.setCurrentView(viewName, store)`.

### Calculations

Balance and debt simplification logic lives in `src/util/calculations.ts`. The debt simplification algorithm minimizes the number of transfers needed to settle all balances.

## TypeScript Conventions

- Unused variables/parameters must be prefixed with `_` (enforced by tsconfig)
- Strict null checks enabled — avoid non-null assertions unless certain
- All async DB operations use `async/await` with `try/catch`

## Reference Docs

`technical-references-docs/` contains architecture guides, component pattern examples (10 patterns), and environment variable handling — consult these before adding new patterns.
