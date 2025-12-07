# 🔐 Arquitectura - Sistema de Autenticación

## 📋 Modelo de Datos

### 1. User (Firebase Auth + Firestore)

```typescript
interface User {
  uid: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}
```

### 2. SharedExpense (Actualizado)

```typescript
interface SharedExpense {
  id: string;
  name: string;
  description: string;
  type: "unique" | "recurring";
  status: "active" | "closed";
  createdAt: string;
  closedAt?: string;

  // NUEVO: Roles y permisos
  createdBy: string; // User UID del creador
  administrators: string[]; // Array de User UIDs
  participants: string[]; // Array de User UIDs

  // NOTA: participantIds se elimina, usamos participants directamente
}
```

### 3. Expense (Actualizado)

```typescript
interface Expense {
  id: string;
  sharedExpenseId: string;
  payerId: string; // User UID
  amount: number;
  description: string;
  date: string;

  // NUEVO: Auditoría
  createdBy: string; // User UID (quien registró el gasto)
  createdByAdmin: boolean; // true si lo creó un admin
}
```

### 4. Payment (Actualizado)

```typescript
interface Payment {
  id: string;
  sharedExpenseId: string;
  fromId: string; // User UID
  toId: string; // User UID
  amount: number;
  date: string;

  // NUEVO: Auditoría
  createdBy: string; // User UID
  createdByAdmin: boolean;
}
```

## 🔒 Reglas de Acceso

### Matrix de Permisos

| Acción                                                       | Participante               | Administrador            |
| ------------------------------------------------------------ | -------------------------- | ------------------------ |
| Ver shared expense                                           | ✅ Si está en participants | ✅ Siempre               |
| Crear expense propio                                         | ✅ Sí                      | ✅ Sí                    |
| Crear expense de otros                                       | ❌ No                      | ✅ Sí                    |
| Eliminar expense propio (createdBy = self & !createdByAdmin) | ✅ Sí                      | ✅ Sí                    |
| Eliminar expense de admin                                    | ❌ No                      | ✅ Sí                    |
| Crear payment propio                                         | ✅ Sí                      | ✅ Sí                    |
| Crear payment de otros                                       | ❌ No                      | ✅ Sí                    |
| Eliminar payment propio                                      | ✅ Sí                      | ✅ Sí                    |
| Eliminar payment de admin                                    | ❌ No                      | ✅ Sí                    |
| Agregar participantes                                        | ❌ No                      | ✅ Sí                    |
| Cerrar shared expense                                        | ❌ No                      | ✅ Sí (con validaciones) |

### Condiciones para Cerrar

```typescript
function canCloseSharedExpense(
  sharedExpense: SharedExpense,
  currentUser: string,
  expenses: Expense[],
  balances: Balance[]
): boolean {
  // 1. Usuario debe ser admin
  if (!sharedExpense.administrators.includes(currentUser)) {
    return false;
  }

  // 2. Debe haber al menos un gasto
  const expensesInShared = expenses.filter(
    (e) => e.sharedExpenseId === sharedExpense.id
  );
  if (expensesInShared.length === 0) {
    return false;
  }

  // 3. Todos los balances deben estar en cero
  const allBalancesZero = balances.every((b) => Math.abs(b.balance) < 0.01);

  return allBalancesZero;
}
```

## 👥 Estrategias para Agregar Participantes

### Opción 1: Por Email (Recomendado)

**Ventajas:**

- Simple de implementar
- No requiere sistema de invitaciones complejo
- Usuario puede unirse cuando quiera

**Flujo:**

1. Admin ingresa email del participante
2. Sistema verifica si existe usuario con ese email en Firebase Auth
3. Si existe → agrega a `participants[]` inmediatamente
4. Si NO existe → guarda en `pendingInvitations[]` y envía email de invitación
5. Cuando el usuario se registre, automáticamente se une

```typescript
interface PendingInvitation {
  email: string;
  sharedExpenseId: string;
  invitedBy: string;
  invitedAt: string;
  role: "participant" | "administrator";
}
```

### Opción 2: Por Link de Invitación

**Ventajas:**

- Más flexible
- Funciona con cualquier email
- Puede compartirse por WhatsApp, etc.

**Flujo:**

1. Admin genera link: `app.com/join/ABC123`
2. Link contiene token único que mapea al shared expense
3. Usuario se registra/loguea y automáticamente se une

```typescript
interface InvitationLink {
  token: string;
  sharedExpenseId: string;
  createdBy: string;
  expiresAt: string;
  maxUses?: number;
  usedBy: string[];
  role: "participant" | "administrator";
}
```

### Opción 3: Por Username/ID (Menos Recomendado)

Requiere sistema de búsqueda, más complejo.

### 🎯 Recomendación: Opción 1 + Opción 2

**Implementación híbrida:**

- **Por Email:** Para invitar a alguien específico
- **Por Link:** Para compartir en grupos (WhatsApp, etc.)

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin(sharedExpenseId) {
      return isAuthenticated() &&
        request.auth.uid in get(/databases/$(database)/documents/sharedExpenses/$(sharedExpenseId)).data.administrators;
    }

    function isParticipant(sharedExpenseId) {
      return isAuthenticated() &&
        request.auth.uid in get(/databases/$(database)/documents/sharedExpenses/$(sharedExpenseId)).data.participants;
    }

    function isAdminOrParticipant(sharedExpenseId) {
      return isAdmin(sharedExpenseId) || isParticipant(sharedExpenseId);
    }

    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;
    }

    // Shared Expenses
    match /sharedExpenses/{sharedExpenseId} {
      allow read: if isAdminOrParticipant(sharedExpenseId);
      allow create: if isAuthenticated() &&
        request.resource.data.createdBy == request.auth.uid &&
        request.auth.uid in request.resource.data.administrators &&
        request.auth.uid in request.resource.data.participants;
      allow update: if isAdmin(sharedExpenseId);
      allow delete: if isAdmin(sharedExpenseId);
    }

    // Expenses
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() &&
        isAdminOrParticipant(resource.data.sharedExpenseId);

      allow create: if isAuthenticated() &&
        isAdminOrParticipant(request.resource.data.sharedExpenseId) &&
        request.resource.data.createdBy == request.auth.uid;

      allow delete: if isAuthenticated() && (
        // Own expense not created by admin
        (resource.data.createdBy == request.auth.uid &&
         resource.data.createdByAdmin == false) ||
        // Is admin
        isAdmin(resource.data.sharedExpenseId)
      );
    }

    // Payments
    match /payments/{paymentId} {
      allow read: if isAuthenticated() &&
        isAdminOrParticipant(resource.data.sharedExpenseId);

      allow create: if isAuthenticated() &&
        isAdminOrParticipant(request.resource.data.sharedExpenseId) &&
        request.resource.data.createdBy == request.auth.uid;

      allow delete: if isAuthenticated() && (
        (resource.data.createdBy == request.auth.uid &&
         resource.data.createdByAdmin == false) ||
        isAdmin(resource.data.sharedExpenseId)
      );
    }

    // Pending Invitations
    match /pendingInvitations/{invitationId} {
      allow read: if isAuthenticated() &&
        request.auth.token.email == resource.data.email;
      allow create: if isAuthenticated() &&
        isAdmin(request.resource.data.sharedExpenseId);
      allow delete: if isAuthenticated();
    }

    // Invitation Links
    match /invitationLinks/{linkId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() &&
        isAdmin(request.resource.data.sharedExpenseId);
      allow update: if isAuthenticated(); // Para marcar como usado
    }
  }
}
```

## 📊 Estructura de Archivos

```
src/
├── auth/
│   ├── AuthProvider.ts          // Context/Provider de auth
│   ├── authService.ts           // Firebase Auth operations
│   ├── useAuth.ts               // Hook personalizado (opcional)
│   └── ProtectedRoute.ts        // HOC para rutas protegidas
├── services/
│   ├── userService.ts           // CRUD usuarios en Firestore
│   ├── invitationService.ts     // Manejo de invitaciones
│   └── permissionService.ts     // Lógica de permisos
├── components/
│   ├── auth/
│   │   ├── LoginScreen.ts       // Pantalla de login
│   │   └── UserProfile.ts       // Perfil del usuario
│   └── invitations/
│       ├── InviteByEmail.ts     // Invitar por email
│       └── InviteByLink.ts      // Generar link
├── types/
│   └── auth.ts                  // Tipos de autenticación
└── store.ts                     // Integrar currentUser
```

## 🔄 Flujo de Autenticación

```
1. Usuario visita app
   ↓
2. Firebase Auth detecta estado
   ↓
3. Si NO autenticado → LoginScreen
   ↓
4. Usuario hace login con Google
   ↓
5. Firebase Auth retorna user
   ↓
6. Crear/actualizar documento en Firestore users/
   ↓
7. Verificar invitaciones pendientes
   ↓
8. Agregar automáticamente a shared expenses invitados
   ↓
9. Actualizar AppStore con currentUser
   ↓
10. Redirigir a shared-expense-list
```

## 🎨 UI/UX Considerations

### Login Screen

- Botón grande "Continuar con Google"
- Mensaje: "Inicia sesión para gestionar tus gastos compartidos"
- Logo de la app

### Shared Expense Card

- Badge: "Admin" o "Participante"
- Si es admin: icono de configuración visible

### Agregar Participante

- Tab 1: "Por Email"
- Tab 2: "Por Link"
- Lista de participantes actuales con badges (Admin/Participante)

### Botón Cerrar

- Solo visible para admins
- Disabled con tooltip si no cumple condiciones:
  - "Debes tener al menos un gasto"
  - "Los balances deben estar en cero"

## 🚀 Fases de Implementación

### Fase 1: Autenticación Básica

- [ ] Configurar Firebase Auth
- [ ] LoginScreen con Google Sign-In
- [ ] AuthService con login/logout
- [ ] Guardar user en Firestore
- [ ] ProtectedRoute/guard

### Fase 2: Roles y Permisos

- [ ] Actualizar tipos (User, SharedExpense, Expense, Payment)
- [ ] PermissionService con toda la lógica
- [ ] Actualizar UI según permisos
- [ ] Firestore Security Rules

### Fase 3: Invitaciones

- [ ] InviteByEmail component
- [ ] PendingInvitations collection
- [ ] Auto-join al registrarse
- [ ] Notificaciones por email (opcional)

### Fase 4: Links de Invitación

- [ ] InvitationLinks collection
- [ ] Generar token único
- [ ] Página /join/:token
- [ ] Tracking de usos

### Fase 5: Cierre de Shared Expense

- [ ] Validación de condiciones
- [ ] UI con feedback claro
- [ ] Confirmación con resumen
