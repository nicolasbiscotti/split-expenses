# [CLOSED] Modern icons with Lucide across the app

**Type:** feature
**Opened:** 2026-04-10
**Resolved:** 2026-04-11

## Resolution

Implemented in full across 15 files. Lucide integrated via `createIcons()` placeholder approach: templates emit `<i data-lucide="icon-name">` strings using the `icon()` helper from `src/util/icons.ts`, and `renderIcons()` is called in `render.ts` after every `innerHTML` update. All 23 icons are tree-shaken through a single `ICON_SET` constant.

Key outcomes:
- Bottom nav: 4 Lucide stroke icons + text labels (Slack-style)
- All form headers have a matching icon before the title
- All action buttons have icons per the icon map
- All 🗑️ emoji replaced with `Trash2`; loading state uses `Loader2` with `animate-spin`
- All 💰 / 👥 / 📬 UI emoji replaced with `Wallet`, `Users`, `Mail`

## Description

The app currently uses emoji characters as icons (📊 ➕ 💸 📜 🗑️). The client wants modern, consistent icons similar to Slack's mobile app — clean stroke icons throughout the bottom nav, form headers, action buttons, and list item actions.

**Library chosen:** [Lucide](https://lucide.dev/) — open-source, MIT, consistent stroke weight, tree-shakeable, Slack-aesthetic.

## Integration approach

Lucide's vanilla JS API works by replacing `<i data-lucide="icon-name">` placeholder elements with inline SVGs after the DOM is written. This fits the existing render cycle cleanly:

1. Template strings use `<i data-lucide="icon-name" class="...">` placeholders via the `icon()` helper
2. `render.ts` calls `renderIcons()` once after `rootEl.innerHTML` is set, before `setup()`
3. Only the icons actually used in the app are imported (tree-shaking)

## Icon map

### Bottom navigation bar

| Tab | Lucide icon |
|-----|-------------|
| Dashboard | `LayoutDashboard` |
| Gasto | `PlusSquare` |
| Pago | `ArrowRightLeft` |
| Historial | `Clock` |

### Form & view headers

| Header | Lucide icon |
|--------|-------------|
| "Agregar Gasto" | `Receipt` |
| "Registrar Pago" | `ArrowRightLeft` |
| "Mi Perfil" | `User` |
| "Mis Contactos" | `Users` |
| "Nueva invitación" | `Mail` (large, illustrative) |
| "Gastos" (history section) | `Receipt` |
| "Pagos" (history section) | `ArrowRightLeft` |
| "Resumen Total" | `BarChart2` |
| "Balance por Persona" | `Scale` |
| "Cómo Saldar Cuentas" | `Handshake` |
| "Crear Gasto Compartido" (wizard) | `FolderPlus` |
| "Mis Gastos" (list header) | `Wallet` |

### Action buttons

| Button | Lucide icon | Position |
|--------|-------------|----------|
| Back buttons (← Volver) | `ArrowLeft` | before text |
| "Guardar" | `Check` | before text |
| "Cancelar" | `X` | before text |
| "Continuar" (wizard) | `ChevronRight` | after text |
| "Crear Gasto Compartido" (submit) | `FolderPlus` | before text |
| "+ Crear Nuevo / Primer Gasto Compartido" | `FolderPlus` | before text |
| "Agregar contacto" toggle | `UserPlus` | before text |
| "Agregar" (save contact) | `Check` | before text |
| "Unirse al grupo" | `UserCheck` | before text |
| "Cerrar sesión" | `LogOut` | before text |
| "Cargar más" (load more) | `ChevronDown` | after text |

### List item actions

| Action | Lucide icon |
|--------|-------------|
| Delete expense / payment / contact | `Trash2` |
| Delete loading state | `Loader2` + `animate-spin` |
| Participants count (👥) | `Users` |
| Pending invite indicator (📬) | `Mail` |

## Files affected

`src/util/icons.ts` (new), `src/render.ts`, `src/components/menus/bottomNavBar.ts`, `src/components/menus/sharedExpenseTopBar.ts`, `src/components/expenseForm/expenseForm.ts`, `src/components/paymentForm/paymentForm.ts`, `src/components/history/expenseList.ts`, `src/components/history/paymentList.ts`, `src/components/profile/profile.ts`, `src/components/dashboard/dashboard.ts`, `src/components/dashboard/debtList.ts`, `src/components/createSteps/createStep1.ts`, `src/components/createSteps/createStep2.ts`, `src/components/createSteps/createStep3.ts`, `src/components/inviteDetail/inviteDetail.ts`, `src/components/sharedExpenseList/sharedExpenseList.ts`, `src/components/shared/addContactForm.ts`

## Acceptance criteria

- [x] Bottom nav shows 4 Lucide icons with text labels, evenly spaced (no emoji)
- [x] All form headers have a matching icon before the title
- [x] All action buttons have an icon per the icon map
- [x] Delete buttons on list items use `Trash2` icon (no emoji)
- [x] `pnpm build` passes with zero TypeScript errors
- [x] No unused icon imports (tree-shaking via single ICON_SET constant)
