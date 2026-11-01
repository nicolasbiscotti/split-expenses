# Session: Issues #016 + #017 — ARS Currency Formatting & Lucide Icons

**Date:** 2026-04-11
**Branch:** develop-0804-to

## What was done

Implemented two client-requested UI features: ARS currency auto-formatting on money form fields (#016) and a modern icon system with Lucide throughout the app (#017).

### #016 — ARS currency input formatting

Replaced both `type="number"` amount inputs (expense and payment forms) with `type="text"` + `inputmode="decimal"` fields that auto-format to Argentine locale as the user types.

- New `src/util/currencyInput.ts` with three pure functions (`parseCurrencyInput`, `formatForDisplay`, `formatWhileTyping`) and a DOM-attachment helper (`setupCurrencyInput`)
- `formatWhileTyping` adds thousands separators progressively and caps decimal input at 2 digits
- Accepts both `.` and `,` as decimal separator; normalizes to es-AR format on blur
- `$` sign displayed inside the field via absolute positioning
- 13 unit tests written TDD-first; all passing

### #017 — Lucide icons

Replaced all emoji UI icons with Lucide stroke icons across the app.

- New `src/util/icons.ts` centralises 23 icon imports, exports `renderIcons()` and the `icon()` template helper
- `render.ts` calls `renderIcons()` after every `innerHTML` update (both landing and main render paths)
- Bottom nav: `LayoutDashboard`, `PlusSquare`, `ArrowRightLeft`, `Clock` with text labels
- Form headers, action buttons, delete buttons, and section titles all updated across 15+ files
- Dynamic states (delete loading/error) use `renderIcons()` after `btn.innerHTML` swap

## Design decisions

| Question | Decision | Reason |
|----------|----------|--------|
| `type="number"` vs `type="text"` | `type="text"` + `inputmode="decimal"` | `type="number"` can't display formatted strings; `inputmode` preserves numeric keyboard on mobile |
| Decimal separator disambiguation | Period with ≤2 digits after = decimal; period with 3 digits after = thousands | Handles both es-AR formatted values (from prior renders) and US-format paste |
| `$` position | Inside field via absolute positioning | Cleaner visually than an external label |
| Lucide integration approach | `createIcons()` placeholder replacement | Fits the existing template-string render pattern; no JSX needed |
| Icon sizing | `w-6 h-6` nav / `w-5 h-5` headers / `w-4 h-4` buttons | Consistent visual hierarchy |
| Formatter constants | Module-level `Intl.NumberFormat` instances | Avoids repeated construction on every keystroke |

## TDD flow (#016)

1. Wrote `src/util/currencyInput.test.ts` — 13 tests, all red (module not yet created)
2. Implemented `src/util/currencyInput.ts` — all green
3. Refactored: extracted `normalizeDecimalSeparator` helper, promoted `Intl.NumberFormat` instances to module-level constants
4. Wired `setupCurrencyInput` into both form `setup()` functions

## Files changed

| File | Change |
|------|--------|
| `src/util/currencyInput.ts` | New — pure formatting/parsing functions + DOM attachment |
| `src/util/currencyInput.test.ts` | New — 13 unit tests |
| `src/util/icons.ts` | New — Lucide icon set + `renderIcons()` + `icon()` helper |
| `src/render.ts` | Added `renderIcons()` call after every render |
| `src/components/expenseForm/expenseForm.ts` | Currency input + icons |
| `src/components/paymentForm/paymentForm.ts` | Currency input + icons |
| `src/components/menus/bottomNavBar.ts` | Lucide icons replacing emoji |
| `src/components/menus/sharedExpenseTopBar.ts` | ArrowLeft back button |
| `src/components/history/expenseList.ts` | Icons + Trash2 delete |
| `src/components/history/paymentList.ts` | Icons + Trash2 delete |
| `src/components/profile/profile.ts` | Icons throughout |
| `src/components/dashboard/dashboard.ts` | Section header icons |
| `src/components/dashboard/debtList.ts` | Section header icon |
| `src/components/createSteps/createStep1.ts` | Icons |
| `src/components/createSteps/createStep2.ts` | Icons |
| `src/components/createSteps/createStep3.ts` | Icons |
| `src/components/inviteDetail/inviteDetail.ts` | Icons |
| `src/components/sharedExpenseList/sharedExpenseList.ts` | Icons + layout fix on empty state |
| `src/components/shared/addContactForm.ts` | Icons |
| `CLAUDE.md` | Added Icon System and Currency Input sections |
| `docs/issues/closed/016-*` | Closed |
| `docs/issues/closed/017-*` | Closed |

## Next steps

Open issues remaining:
- **#003** — displayName visibility: update participant's `displayName` to their Google display name on invite resolution (small, low-risk)
- **#011** — Participants array → map refactor (unblocked since #010 shipped; large refactor, needs migration script)
- **#014** — Automated test suite: Firestore rules tests with `@firebase/rules-unit-testing`
