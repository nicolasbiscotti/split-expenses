# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep this file to durable guidance. Session progress, feature status, and next steps go in `docs/sessions/` and GitHub issues, never here.

## Commands

```bash
pnpm dev          # Start Vite development server
pnpm build        # TypeScript check + Vite build
pnpm typecheck    # TypeScript check only (run by CI before deploying)
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

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`gh` CLI); `docs/issues/` is a frozen archive referenced as `L-NNN`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

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

## Listener architecture

The app maintains a constant set of 4 Firestore `onSnapshot` listeners while a user is signed in and has a current SE selected:

| Listener | Scope | Purpose |
|----------|-------|---------|
| SE collection | `participantEmails array-contains email` | Detect new Invites in real time |
| SE document | Current SE only | Keep `totalAmount`, `netPaid`, `expensesCount` fresh |
| Expenses sub-collection | Current SE, `limit(expensesLimit)` | Authoritative expense list + badge + toasts |
| Payments sub-collection | Current SE, `limit(paymentsLimit)` | Authoritative payment list + badge + toasts |

All listeners are managed in `store.ts`. `stopInviteListener` and `stopDataListeners` are called on sign-out.

### Notification state

`unreadBy: string[]` on each expense/payment doc is the source of truth. Own writes exclude `recordedByUid` from `unreadBy` at creation time. Badge count = notifications for current SE only. Navigate to History → `markNotificationsRead()` → batch `arrayRemove` in Firestore.

### Pagination

"Load more" increments `expensesLimit`/`paymentsLimit` and re-attaches the same listener (N+1 limit trick to detect `hasMore`).

## Icon System

Icons are provided by [Lucide](https://lucide.dev/) via `src/util/icons.ts`.

- **In templates:** use the `icon(name, cls?)` helper — emits `<i data-lucide="icon-name" class="...">` placeholder strings (kebab-case icon name).
- **After render:** `render.ts` calls `renderIcons()` immediately after every `innerHTML` update. This replaces all `<i data-lucide>` placeholders with inline SVGs.
- **Dynamic icon swaps** (e.g. loading state on a delete button): set `btn.innerHTML = icon(...)` then call `renderIcons()` again — already-replaced SVGs are not double-processed.
- **Adding a new icon:** import it from `lucide` in `icons.ts` and add it to `ICON_SET`.

Icon sizes: `w-6 h-6` in the bottom nav, `w-5 h-5` in section headers, `w-4 h-4` in buttons and inline actions.

## Currency Input

Money form fields use `type="text"` + `inputmode="decimal"` (not `type="number"`) to enable ARS locale formatting.

- **`src/util/currencyInput.ts`** — three pure exported functions:
  - `parseCurrencyInput(raw)` — parses es-AR formatted strings or US-format fallback to a float
  - `formatForDisplay(value)` — formats a number as `"1.500,50"` (no currency symbol)
  - `formatWhileTyping(raw)` — progressive format on each keystroke; caps decimal at 2 digits
- **`setupCurrencyInput(input)`** — attaches `input`/`blur` listeners; returns a `getValue()` accessor for use in submit handlers instead of `parseFloat(formData.get(...))`.
- The `$` sign is shown inside the field via absolute positioning (`relative` wrapper + `absolute left-2` span + `pl-6` on the input).

## Reference Docs

`docs/architecture/` contains architecture guides and component pattern examples (10 patterns). `docs/guides/` contains environment variable handling, Firebase emulator setup, custom events, and the protected-`main` PR flow (`protected-main.md`) — consult these before adding new patterns.
