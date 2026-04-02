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

---

## Ruling (2026-04-02)

### What the proposal actually contains

The proposal bundles three distinct categories of change. Treating them as one block would be a mistake — they have different effort levels and different urgency.

---

### Category 1 — Already aligned (no work needed)

The current codebase already implements the core architectural decisions of the proposal:

| Proposal item | Current state |
|---|---|
| Sub-collections for expenses/payments (Option B) | ✓ Already using sub-collections |
| `creatorUid` on SE document | ✓ Present |
| `participantUids` and `participantEmails` flat arrays on SE | ✓ Present |
| `fromEmail` / `toEmail` on payments | ✓ Present |
| Single denormalized UID on expenses/payments for update/delete rules | ✓ Present as `adminUid` |

---

### Category 2 — Worthwhile renames (low code effort, requires data migration)

Two field renames align the codebase with the proposal's naming and make the rules cleaner:

| Current field | Proposed field | Files affected |
|---|---|---|
| `Expense.adminUid` | `Expense.creatorUid` | `types/index.ts`, `store.ts`, `firestore.rules`, `expenseForm.ts`, `history.ts` |
| `Payment.adminUid` | `Payment.creatorUid` | Same set |
| `Expense.payerEmail` | `Expense.paidByEmail` | `types/index.ts`, `store.ts`, `databaseService.ts`, `expenseForm.ts`, `history.ts`, `calculations.ts`, `dashboard.ts` |

**Effort:** Low — mechanical search-and-replace across ~7 files. Zero logic changes.  
**Data migration required:** Yes — all existing expense and payment documents need the field renamed. The `migrate.js` script can be extended to handle this.

**Also in this category:** Fix two real bugs in the current `firestore.rules`:
- `expenses` and `payments` read rule is `if request.auth != null` with no participant check — any authenticated user can read any group's expenses.
- Operator precedence bug on create/update/delete rules: `&&` binds tighter than `||` but there are no grouping parentheses, so the logic is wrong.

These rule bugs should be fixed regardless of whether the full refactor proceeds.

---

### Category 3 — Structural change: `participants` array → map (medium effort)

The proposal changes `SharedExpense.participants` from:
```typescript
participants: { email: string; displayName: string; uid?: string }[]
```
to a map keyed by email:
```typescript
participants: { [email: string]: { displayName: string; uid: string | null; role: "creator" | "member"; addedAt: Timestamp } }
```

**Files affected:** `types/index.ts`, `databaseService.ts`, `store.ts`, `state/AppState.ts`, `createStep2.ts`, `createStep3.ts`, `expenseForm.ts`, `paymentForm.ts`, `history.ts`, `dashboard.ts`, `debtList.ts`, `sharedExpenseList.ts`, `profile.ts`.

**Effort:** Medium — every place that calls `.map()`, `.find()`, or `.filter()` on `participants` needs to change to `Object.entries()` / `Object.values()`. Roughly 12–15 call sites.  
**Data migration required:** Yes — all existing SE documents need `participants` restructured.  
**Benefit:** Deduplication by key, O(1) participant lookup, `role` field enables future permission tiers.  
**Downside:** More verbose to iterate in TypeScript; the current array is idiomatic and works well.

**Verdict on this change:** Worthwhile but not urgent. The array works correctly today. This is a quality-of-life improvement that pays off more as the app grows.

---

### Category 4 — New fields and features (high effort, out of scope now)

These items in the proposal are genuinely new features, not refactors:

| Field / concept | What it enables | Effort |
|---|---|---|
| `Expense.splits: { [email]: { amount, uid } }` | Per-expense custom split amounts (currently always equal) | High — new form UI, new calculation logic |
| `Expense.recordedByUid` | Audit trail of who entered the expense | Low in code, but requires UI to display |
| `Expense.paidByUid` | Links payer to a Firebase UID when available | Low |
| `Payment.fromUid` / `toUid` | Same — links participants to UIDs | Low |
| `Expense.currency` / `Payment.currency` | Multi-currency support | High |
| `Expense.category` | Expense categorization | Medium |
| `updatedAt` on both | Edit history | Low |
| `SharedExpense.creatorEmail` | Useful for display, redundant with participants | Low |

**Verdict:** Do not apply these now. `splits` in particular is a significant product decision — implementing it means redesigning the expense form and the balance calculation logic. This is a separate initiative, not a schema refactor.

---

### Final decision

**Split the work into two tracks:**

**Track A — Do before #005 (low risk, fixes real bugs):**
1. Fix the `firestore.rules` read permission hole and operator precedence bugs.
2. Rename `adminUid` → `creatorUid` on Expense and Payment (code + data migration).
3. Rename `payerEmail` → `paidByEmail` on Expense (code + data migration).

Rationale: The rules bugs are security issues. The renames are mechanical and cost almost nothing. Doing them before #005 means the notification listener code uses the correct field names from day one.

**Track B — Defer until after #005:**
4. `participants` array → map structural change.
5. All Category 4 new features.

Rationale: The `participants` structure does not affect how notifications are built — the notification listener reads expense/payment documents, not the `participants` map. Deferring avoids a medium-effort refactor on the critical path to #005.

**Is the overall refactor worth it?** Yes for Track A (fixes bugs, zero-cost renames). Conditionally yes for Track B (worthwhile if the app grows to need role-based permissions or custom splits). Track B should be planned as its own issue once #005 is closed.
