# Split Expenses

A web application for tracking and settling shared expenses among a group of people — trips, households, events, or any recurring arrangement where multiple people split costs.

## Features

- Create shared expense groups with named participants
- Record individual expenses (who paid, how much, description)
- Record payments between participants to settle debts
- Automatic balance calculation per participant
- Debt simplification — minimizes the number of transfers needed to settle all balances
- Transaction history with delete support
- Recurring shared expenses (e.g. monthly household costs) and one-off groups
- Argentine locale formatting (ARS currency, es-AR dates)
- Firebase backend with local emulator support for development

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode, no framework) |
| Build | Vite 7 |
| Styles | Tailwind CSS 4 |
| Backend | Firebase / Firestore |
| Package manager | pnpm |

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd split-expenses

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Fill in your Firebase credentials in .env

# 4. Start the dev server
pnpm dev
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite development server |
| `pnpm build` | TypeScript check + production build |
| `pnpm preview` | Preview the production build locally |

## Environment Variables

Copy `.env.example` to `.env` and provide your Firebase project credentials:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIRESTORE_DATA_ID` | Namespace for Firestore data path |
| `VITE_USE_FIREBASE_EMULATORS` | Set to `true` to force emulator use (auto-detected on localhost) |

See [docs/guides/firebase-local-dev.md](docs/guides/firebase-local-dev.md) for local emulator setup.

## Architecture

The app is a vanilla TypeScript SPA with no UI framework. State is managed in two layers:

- **`AppState`** — ephemeral UI state (current view, wizard steps, temporary form data). Implements the observer pattern to trigger re-renders.
- **`AppStore`** — application data (participants, expenses, payments, shared expenses). Wraps all Firebase/Firestore calls.

Each UI component exports two functions: `render(state, store)` returns an HTML string, and `setup(container, state, store)` attaches event listeners. The central render loop in `render.ts` calls both in sequence after every state change.

See [docs/architecture/architecture.en.md](docs/architecture/architecture.en.md) for full architectural documentation.

## Project Structure

```
src/
├── components/         # UI components (render + setup pairs)
│   ├── createSteps/    # 3-step wizard for creating shared expenses
│   ├── dashboard/      # Balance summary and debt list
│   ├── expenseForm/    # Add expense form
│   ├── history/        # Transaction history with delete
│   ├── menus/          # Top bar and bottom navigation
│   ├── paymentForm/    # Record payment form
│   └── sharedExpenseList/  # Main list of shared expense groups
├── firebase/           # Firebase initialization and config
├── services/           # Firestore service wrappers
├── state/              # AppState class (UI state + observer)
├── types/              # TypeScript interfaces
├── util/               # calculations, formatting, toast
├── main.ts             # App entry point
├── render.ts           # Central render loop
└── store.ts            # AppStore class (application data)
```
