---
status: accepted
---

# One Firebase project per environment, keeping the `environments/{dataId}/` prefix

Preview and production used to share one Firebase project (`chat-room-658e3`), separated only by the `environments/{dataId}/` prefix. They therefore shared Auth users, security rules, indexes and quotas, and a rules deploy from any branch would have replaced production's rules. We now use two projects: `chat-room-658e3` stays as **prod**, and a new `split-expenses-dev` serves every preview deploy. Local development keeps using the emulator, so it needs no project. The prefix stays in both projects, with one fixed `VITE_FIRESTORE_DATA_ID` per project (`split-expenses-production` in prod, `preview` in dev). Code, rules and paths don't change, and prod data doesn't move.

## Considered Options

- **Keep one project, namespaced by `dataId`**: rejected. Rules and indexes are project-wide, so CI could never deploy rules from a branch (#28), and preview users and test data lived next to production.
- **A new, cleanly named prod project (`split-expenses-prod`)**: rejected. It would mean copying Firestore and moving Auth users with their UIDs (`auth:export`/`auth:import`). One mistake would break `creatorUid`/`participantUids` for every Shared Expense, and all it buys is a nicer name. The name `chat-room-658e3` only shows up in the Google sign-in popup, and a custom auth domain can hide it later without moving data.
- **Drop the prefix now that projects separate environments**: rejected for now. It would mean moving live prod data and deploying new rules and code at the same moment, and all it buys is shorter paths. It can be its own change later.
- **A third project for local development**: rejected. `localhost` always uses the emulator.

## Consequences

- `split-expenses-dev` is shared by all branches, and the last preview deploy wins. It starts empty: prod data is never copied there.
- Firebase Auth's authorized domains don't accept wildcards, and every Vercel preview URL is different. So every successful preview deploy points one fixed alias, `split-expenses-preview.vercel.app`, at itself, and that alias is the only domain authorized in dev. Google sign-in does not work on raw per-deploy preview URLs.
- Prod authorizes only the production domain (plus its `firebaseapp.com` default). After previews move to dev, `environments/preview` and `environments/development` are deleted from prod, with a backup taken first.
- Auth users are separate per project, so the same Google email has a different UID in each environment. This is harmless because email identifies Participants (ADR 0001).
- CI deploys rules and indexes to both projects (#28): `preview` deploys to dev, so rules changes can be tried before merge, and `production` deploys to prod. Each project has its own least-privilege service account.
- Which project an environment uses is set by Vercel's per-environment variables, so `check` (ADR 0002) is unaffected.
