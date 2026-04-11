# [TODO] Modern icons with Lucide across the app

**Type:** feature
**Opened:** 2026-04-10

## Description

The app currently uses emoji characters as icons (📊 ➕ 💸 📜 🗑️). The client wants modern, consistent icons similar to Slack's mobile app — clean stroke icons throughout the bottom nav, form headers, action buttons, and list item actions.

**Library chosen:** [Lucide](https://lucide.dev/) — open-source, MIT, consistent stroke weight, tree-shakeable, Slack-aesthetic.

## Integration approach

Lucide's vanilla JS API works by replacing `<i data-lucide="icon-name">` placeholder elements with inline SVGs after the DOM is written. This fits the existing render cycle cleanly:

1. Template strings use `<i data-lucide="icon-name" class="...">` placeholders
2. `render.ts` calls `createIcons({ icons: { ... } })` once after `rootEl.innerHTML` is set, before `setup()`
3. Only the icons actually used in the app are imported (tree-shaking)

## Installation

```bash
pnpm add lucide
```

## Icon map

### Bottom navigation bar

| Tab | Current | Lucide icon |
|-----|---------|-------------|
| Dashboard | 📊 | `LayoutDashboard` |
| Gasto | ➕ | `PlusSquare` |
| Pago | 💸 | `ArrowRightLeft` |
| Historial | 📜 | `Clock` |

### Form & view headers (icon before label text)

| Header | Lucide icon |
|--------|-------------|
| "Agregar Gasto" | `Receipt` |
| "Registrar Pago" | `ArrowRightLeft` |
| "Mi Perfil" | `User` |
| "Mis Contactos" | `Users` |
| "Nueva invitación" | `UserPlus` |
| "Gastos" (history section) | `Receipt` |
| "Pagos" (history section) | `ArrowRightLeft` |
| "Resumen Total" | `BarChart2` |
| "Balance por Persona" | `Users` |
| "Cómo Saldar Cuentas" | `Handshake` |
| "Crear Gasto Compartido" (wizard) | `FolderPlus` |

### Action buttons (icon + text)

| Button | Lucide icon | Position |
|--------|-------------|----------|
| "← Volver" / "Volver" (back) | `ArrowLeft` | before text |
| "Guardar" (save forms) | `Check` | before text |
| "Cancelar" | `X` | before text |
| "Continuar" (wizard next) | `ChevronRight` | after text |
| "Crear Gasto Compartido" (final submit) | `FolderPlus` | before text |
| "+ Crear Nuevo Gasto Compartido" | `FolderPlus` | before text |
| "+ Agregar contacto" | `UserPlus` | before text |
| "Agregar" (save contact) | `Check` | before text |
| "Unirse al grupo" | `UserCheck` | before text |
| "Cerrar sesión" | `LogOut` | before text |
| "Cargar más gastos / pagos" | `ChevronDown` | after text |

### List item actions (icon-only buttons)

| Action | Current | Lucide icon |
|--------|---------|-------------|
| Delete expense | 🗑️ | `Trash2` |
| Delete payment | 🗑️ | `Trash2` |
| Delete contact | 🗑️ | `Trash2` |

## Implementation plan

### 1. Install Lucide and wire into render cycle

```bash
pnpm add lucide
```

Create `src/util/icons.ts` — single place that imports all used icons and exports a `renderIcons()` wrapper:

```typescript
import { createIcons, LayoutDashboard, PlusSquare, ... } from 'lucide';

export function renderIcons() {
  createIcons({ icons: { LayoutDashboard, PlusSquare, ... } });
}
```

Update `src/render.ts`: call `renderIcons()` after `rootEl.innerHTML = rendered` and before `setup(state, store)`.

### 2. Update bottom nav — `src/components/menus/bottomNavBar.ts`

Replace emoji with `<i data-lucide="...">` and keep text labels below (Slack-style: icon on top, label below).

### 3. Update form headers

Add `<i data-lucide="...">` before the heading text in each form/view header. Consistent size: `class="inline-block w-5 h-5 mr-2"`.

### 4. Update action buttons

Add icon to each button per the icon map above. Icon size in buttons: `class="inline-block w-4 h-4 mr-1"` (before text) or `ml-1` (after text).

### 5. Update list item delete buttons

Replace `🗑️` emoji with `<i data-lucide="trash-2" class="w-4 h-4">` in `expenseList.ts`, `paymentList.ts`, and `profile.ts`.

### 6. Remove remaining standalone emoji icons

- `💰` in `sharedExpenseList.ts` header → replace with `Wallet` icon
- Any remaining emoji used as UI icons (not content)

## Files affected

`src/render.ts`, `src/util/icons.ts` (new), `src/components/menus/bottomNavBar.ts`, `src/components/expenseForm/expenseForm.ts`, `src/components/paymentForm/paymentForm.ts`, `src/components/history/expenseList.ts`, `src/components/history/paymentList.ts`, `src/components/profile/profile.ts`, `src/components/dashboard/dashboard.ts`, `src/components/dashboard/debtList.ts`, `src/components/createSteps/createStep1.ts`, `src/components/createSteps/createStep2.ts`, `src/components/createSteps/createStep3.ts`, `src/components/inviteDetail/inviteDetail.ts`, `src/components/sharedExpenseList/sharedExpenseList.ts`

## Acceptance criteria

- [ ] Bottom nav shows 4 Lucide icons with text labels, evenly spaced (no emoji)
- [ ] All form headers have a matching icon before the title
- [ ] All action buttons have an icon per the icon map
- [ ] Delete buttons on list items use `Trash2` icon (no emoji)
- [ ] `pnpm build` passes with zero TypeScript errors
- [ ] No unused icon imports (tree-shaking verified by build output size)

## Related

- Bottom nav implementation: `src/components/menus/bottomNavBar.ts`
- Render cycle: `src/render.ts`
