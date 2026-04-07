# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Vite development server
pnpm build        # TypeScript check + Vite build
pnpm preview      # Preview production build
pnpm test         # Run all unit tests (single pass)
pnpm test:watch   # Run tests in watch mode
```

TypeScript strict mode and Vitest unit tests are the primary static checks.

## Environment Setup

Copy `.env.example` to `.env` and fill in Firebase credentials. Key variables:
- `VITE_FIRESTORE_DATA_ID` — namespace for Firestore data
- `VITE_USE_FIREBASE_EMULATORS` — set to `true` to use local emulator (auto-detected on localhost)

See `docs/guides/firebase-local-dev.md` for emulator setup.

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

## Language Convention

Code and comments must be in English. The UI (user-facing strings in HTML templates) must be in Spanish. Migrate existing Spanish comments to English as files are modified.

## TypeScript Conventions

- Unused variables/parameters must be prefixed with `_` (enforced by tsconfig)
- Strict null checks enabled — avoid non-null assertions unless certain
- All async DB operations use `async/await` with `try/catch`

## Testing

Tests are written with [Vitest](https://vitest.dev/). Run with `pnpm test` (single pass) or `pnpm test:watch` (watch mode).

### TDD workflow

For every new feature or bug fix:
1. Write a failing test that describes the expected behavior
2. Write the minimum code to make the test pass
3. Refactor — clean up while keeping tests green

### What to test

- **Unit tests** (`src/**/*.test.ts`) — pure functions with no side effects: calculation utilities, notification builders, transformation logic. These run without Firebase.
- **Firestore rules tests** (deferred to #014) — `@firebase/rules-unit-testing` against the emulator.
- Do **not** unit test `onSnapshot` wiring, Firestore service calls, or render functions — integration concerns.

### File conventions

Co-locate test files with the source: `src/util/calculations.test.ts` next to `calculations.ts`, `src/services/notificationService.test.ts` next to `notificationService.ts`, etc.

## Reference Docs

`docs/architecture/` contains architecture guides and component pattern examples (10 patterns). `docs/guides/` contains environment variable handling, Firebase emulator setup, and custom events — consult these before adding new patterns.
