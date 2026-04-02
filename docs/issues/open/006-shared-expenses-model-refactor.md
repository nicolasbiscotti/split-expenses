# [TODO] Evaluate and apply shared expenses model refactor

**Type:** todo
**Opened:** 2026-04-02

## Description

`docs/shared-expenses-revised.md` proposes changes to the shared expenses data model.
Before committing to implementation, we need to assess the cost of the refactor and decide when to apply it relative to other open work.

## Tasks

1. **Compare**: Diff the proposal in `docs/shared-expenses-revised.md` against the current codebase (types, services, store, components, Firestore rules) and identify every change required.
2. **Estimate effort**: Categorize each change as low / medium / high effort and flag any breaking changes or migration requirements for existing Firestore data.
3. **Decide**: Based on the effort assessment, determine whether the refactor is worth doing and, if so, whether it should be applied **before** or **after** resolving issue #005 (in-app notification system).

## Key consideration for ordering

If the revised model changes how shared expenses, expenses, or payments are structured in Firestore, applying it *before* #005 avoids building the notification listeners on top of a schema that will change. However, if the effort is large and #005 is higher priority, the notification system may be implemented first against the current model and adapted afterward.

## Related

- `docs/shared-expenses-revised.md` — the proposal to evaluate
- [#005](005-in-app-notification-system.md) — in-app notification system (ordering dependency)
