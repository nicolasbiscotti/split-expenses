# 🚀 Plan de Implementación - Sistema de Autenticación

## ✅ Archivos Ya Creados

### Core Auth

- [x] `types/auth.ts` - Tipos de autenticación
- [x] `types/index.ts` - Tipos actualizados con auth
- [x] `auth/authService.ts` - Firebase Authentication
- [x] `services/userService.ts` - Gestión de usuarios en Firestore
- [x] `services/permissionService.ts` - Lógica de permisos
- [x] `services/invitationService.ts` - Sistema de invitaciones
- [x] `components/auth/LoginScreen.ts` - Pantalla de login

## 📝 Archivos Pendientes de Crear

### 1. ✅ Actualizar AppStore con Autenticación

```typescript
// src/store.ts - Agregar estas propiedades y métodos

import { signInWithGoogle, signOut } from './auth/authService';
import { createOrUpdateUser, getUsersByIds } from './services/userService';
import {
  getPendingInvitationsByEmail,
  acceptPendingInvitation
} from './services/invitationService';
import type { User } from './types/auth';

export default class AppStore {
  // ... propiedades existentes

  private currentUser: User | null = null;

  // Getter para usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  // Login
  async signInWithGoogle(): Promise<void> {
    const user = await signInWithGoogle();
    await createOrUpdateUser(user);
    this.currentUser = user;

    // Verificar invitaciones pendientes
    await this.processP endingInvitations(user.email);
  }

  // Logout
  async signOut(): Promise<void> {
    await signOut();
    this.currentUser = null;
    this.state.setCurrentView('login', this);
  }

  // Procesar invitaciones pendientes
  private async processPendingInvitations(email: string): Promise<void> {
    const invitations = await getPendingInvitationsByEmail(email);

    for (const invitation of invitations) {
      try {
        await acceptPendingInvitation(invitation.id, this.currentUser!.uid);
        console.log('Auto-accepted invitation:', invitation.sharedExpenseName);
      } catch (error) {
        console.error('Error auto-accepting invitation:', error);
      }
    }
  }

  // Obtener usuarios por UIDs (actualizado)
  async getUsersByIds(uids: string[]): Promise<User[]> {
    return await getUsersByIds(uids);
  }
}
```

### 2. ✅ Actualizar main.ts con Auth Observer

```typescript
// src/main.ts

import { onAuthStateChange, firebaseUserToUser } from "./auth/authService";
import { createOrUpdateUser } from "./services/userService";

// ... código existente

// Observer de autenticación
onAuthStateChange(async (firebaseUser) => {
  if (firebaseUser) {
    // Usuario logueado
    const user = firebaseUserToUser(firebaseUser);
    await createOrUpdateUser(user);
    store.setCurrentUser(user);

    // Procesar invitaciones pendientes
    await store.processPendingInvitations(user.email);

    // Cargar datos
    await store.loadFromStorage();
  } else {
    // Usuario no logueado
    store.setCurrentUser(null);
    state.setCurrentView("login", store);
  }
});
```

### 3. ✅ Actualizar render.ts

```typescript
// src/render.ts

import renderLoginScreen, {
  setupLoginScreen,
} from "./components/auth/LoginScreen";

function renderViewContent(
  view: string,
  state: AppState,
  store: AppStore
): string {
  switch (view) {
    case "login":
      return renderLoginScreen();

    // ... resto de casos
  }
}

function setupViewInteractions(
  view: string,
  state: AppState,
  store: AppStore
): void {
  if (view === "login") {
    const container = document.getElementById("app");
    if (container) {
      setupLoginScreen(container, state, store);
    }
  }

  // ... resto de casos
}
```

### 4. ✅ Actualizar createSharedExpense

```typescript
// En el componente createStep3.ts

const handleCreate = async () => {
  // ... código existente

  const currentUser = store.getCurrentUser();
  if (!currentUser) {
    alert("Debes estar logueado para crear un gasto compartido");
    return;
  }

  const newSharedExpense: SharedExpense = {
    id: "",
    name: data.name,
    description: data.description,
    type: data.type,
    status: "active",
    createdAt: new Date().toISOString(),

    // NUEVO: Auth fields
    createdBy: currentUser.uid,
    administrators: [currentUser.uid],
    participants: [currentUser.uid], // Se incluye a sí mismo
  };

  await store.createSharedExpense(newSharedExpense);
  // ...
};
```

### 5. ✅  Actualizar addExpense y addPayment

```typescript
// En main.ts, event handler de expense-form

if (form.id === "expense-form") {
  const formData = new FormData(form);
  const currentUser = store.getCurrentUser();
  const currentExpenseId = store.getCurrentSharedExpenseId();
  const sharedExpense = store.getSharedExpense(currentExpenseId!);

  if (!currentUser || !sharedExpense) {
    alert("Error: Usuario o gasto compartido no encontrado");
    return;
  }

  // Verificar si es admin
  const isAdmin = sharedExpense.administrators.includes(currentUser.uid);

  try {
    await store.addExpense(
      {
        id: "",
        sharedExpenseId: currentExpenseId!,
        payerId: formData.get("payerId") as string,
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description") as string,
        date: new Date().toISOString(),

        // NUEVO: Auditoría
        createdBy: currentUser.uid,
        createdByAdmin: isAdmin,
      },
      "dashboard"
    );
  } catch (error) {
    alert("Error al agregar el gasto");
  }
}
```

### 6. Componente para Gestionar Participantes

```typescript
// src/components/participants/ManageParticipants.ts

export default function renderManageParticipants(
  state: AppState,
  store: AppStore
): string {
  const currentUser = store.getCurrentUser();
  const sharedExpenseId = store.getCurrentSharedExpenseId();
  const sharedExpense = store.getSharedExpense(sharedExpenseId!);

  if (!sharedExpense || !currentUser) {
    return "<div>Error: No se encontró el gasto compartido</div>";
  }

  const isAdmin = sharedExpense.administrators.includes(currentUser.uid);

  if (!isAdmin) {
    return "<div>Solo los administradores pueden gestionar participantes</div>";
  }

  const participants = await store.getUsersByIds(sharedExpense.participants);

  return `
    <div class="space-y-4">
      <header class="mb-6">
        <button onclick="setView('dashboard')" class="text-blue-600">
          ← Volver
        </button>
        <h1 class="text-2xl font-bold mt-2">Gestionar Participantes</h1>
      </header>

      <!-- Lista de participantes actuales -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="font-semibold mb-3">Participantes Actuales</h2>
        <div class="space-y-2">
          ${participants
            .map(
              (p) => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div class="flex items-center gap-3">
                ${
                  p.photoURL
                    ? `
                  <img src="${p.photoURL}" class="w-10 h-10 rounded-full" />
                `
                    : `
                  <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    ${p.displayName.charAt(0).toUpperCase()}
                  </div>
                `
                }
                <div>
                  <p class="font-medium">${p.displayName}</p>
                  <p class="text-sm text-gray-600">${p.email}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 text-xs rounded ${
                  sharedExpense.administrators.includes(p.uid)
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-700"
                }">
                  ${
                    sharedExpense.administrators.includes(p.uid)
                      ? "Admin"
                      : "Participante"
                  }
                </span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Agregar participante -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="font-semibold mb-3">Agregar Participante</h2>
        
        <div class="flex gap-2 mb-4">
          <button 
            id="tab-email" 
            class="flex-1 py-2 border-b-2 border-blue-600 text-blue-600 font-medium"
          >
            Por Email
          </button>
          <button 
            id="tab-link" 
            class="flex-1 py-2 border-b-2 border-gray-300 text-gray-600"
          >
            Por Link
          </button>
        </div>

        <!-- Tab: Por Email -->
        <div id="email-tab-content">
          <form id="invite-by-email-form" class="space-y-3">
            <input
              type="email"
              name="email"
              required
              class="w-full p-2 border rounded"
              placeholder="email@ejemplo.com"
            />
            
            <label class="flex items-center gap-2">
              <input type="checkbox" name="isAdmin" />
              <span class="text-sm">Agregar como administrador</span>
            </label>
            
            <button 
              type="submit" 
              class="w-full bg-blue-600 text-white py-2 rounded"
            >
              Enviar Invitación
            </button>
          </form>
        </div>

        <!-- Tab: Por Link (oculto por defecto) -->
        <div id="link-tab-content" class="hidden">
          <button 
            id="generate-link-btn" 
            class="w-full bg-green-600 text-white py-2 rounded mb-4"
          >
            Generar Link de Invitación
          </button>
          
          <div id="generated-link" class="hidden">
            <div class="bg-gray-50 p-3 rounded flex items-center gap-2">
              <input 
                id="link-url" 
                type="text" 
                readonly 
                class="flex-1 bg-transparent"
              />
              <button 
                id="copy-link-btn" 
                class="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Copiar
              </button>
            </div>
            <p class="text-xs text-gray-600 mt-2">
              Comparte este link para invitar participantes
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

### 7. Componente Join (para links de invitación)

```typescript
// src/components/invitations/JoinSharedExpense.ts

export default function renderJoinSharedExpense(): string {
  return `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow p-6">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">💰</div>
          <h1 class="text-2xl font-bold">Unirse a Gasto Compartido</h1>
        </div>

        <div id="join-content">
          <p class="text-center text-gray-600">Cargando...</p>
        </div>
      </div>
    </div>
  `;
}

export function setupJoinSharedExpense(
  container: HTMLElement,
  state: AppState,
  store: AppStore,
  token: string
): void {
  const content = container.querySelector("#join-content");

  const handleJoin = async () => {
    const currentUser = store.getCurrentUser();

    if (!currentUser) {
      // Redirigir a login
      state.setCurrentView("login", store);
      return;
    }

    try {
      const result = await useInvitationLink(linkId, currentUser.uid);

      if (result.success && result.sharedExpenseId) {
        store.setCurrentSharedExpenseId(result.sharedExpenseId);
        state.setCurrentView("dashboard", store);
      } else {
        if (content) {
          content.innerHTML = `
            <div class="text-center">
              <p class="text-red-600 mb-4">${result.message}</p>
              <button onclick="setView('shared-expense-list')" class="text-blue-600">
                Ir a Mis Gastos
              </button>
            </div>
          `;
        }
      }
    } catch (error) {
      if (content) {
        content.innerHTML = `
          <div class="text-center">
            <p class="text-red-600 mb-4">Error al unirse al gasto compartido</p>
            <button onclick="setView('shared-expense-list')" class="text-blue-600">
              Ir a Mis Gastos
            </button>
          </div>
        `;
      }
    }
  };

  handleJoin();
}
```

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

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

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && request.auth.uid == userId;
    }

    match /sharedExpenses/{sharedExpenseId} {
      allow read: if isAuthenticated() && (
        request.auth.uid in resource.data.administrators ||
        request.auth.uid in resource.data.participants
      );

      allow create: if isAuthenticated() &&
        request.resource.data.createdBy == request.auth.uid &&
        request.auth.uid in request.resource.data.administrators;

      allow update: if isAdmin(sharedExpenseId);
    }

    match /expenses/{expenseId} {
      allow read: if isAuthenticated() && (
        isAdmin(resource.data.sharedExpenseId) ||
        isParticipant(resource.data.sharedExpenseId)
      );

      allow create: if isAuthenticated() &&
        (isAdmin(request.resource.data.sharedExpenseId) ||
         isParticipant(request.resource.data.sharedExpenseId)) &&
        request.resource.data.createdBy == request.auth.uid;

      allow delete: if isAuthenticated() && (
        (resource.data.createdBy == request.auth.uid &&
         resource.data.createdByAdmin == false) ||
        isAdmin(resource.data.sharedExpenseId)
      );
    }

    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (
        isAdmin(resource.data.sharedExpenseId) ||
        isParticipant(resource.data.sharedExpenseId)
      );

      allow create: if isAuthenticated() &&
        (isAdmin(request.resource.data.sharedExpenseId) ||
         isParticipant(request.resource.data.sharedExpenseId)) &&
        request.resource.data.createdBy == request.auth.uid;

      allow delete: if isAuthenticated() && (
        (resource.data.createdBy == request.auth.uid &&
         resource.data.createdByAdmin == false) ||
        isAdmin(resource.data.sharedExpenseId)
      );
    }

    match /pendingInvitations/{invitationId} {
      allow read: if isAuthenticated() &&
        request.auth.token.email == resource.data.email;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /invitationLinks/{linkId} {
      allow read: if true; // Público para que cualquiera pueda ver
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
  }
}
```

## 📋 Checklist de Implementación

### Fase 1: Setup Básico

- [ ] Configurar Firebase Authentication en console
- [ ] Habilitar Google Sign-In provider
- [ ] Copiar archivos creados a tu proyecto
- [ ] Actualizar firebase config

### Fase 2: Integración con AppStore

- [ ] Agregar currentUser a AppStore
- [ ] Implementar signInWithGoogle() y signOut()
- [ ] Implementar processPendingInvitations()
- [ ] Actualizar getUsersByIds() para usar userService

### Fase 3: Auth Observer

- [ ] Agregar onAuthStateChange en main.ts
- [ ] Redirigir a login si no está autenticado
- [ ] Procesar invitaciones pendientes al login

### Fase 4: Actualizar Vistas

- [ ] Agregar 'login' a ViewType
- [ ] Integrar LoginScreen en render.ts
- [ ] Actualizar createSharedExpense con campos de auth
- [ ] Actualizar addExpense con createdBy y createdByAdmin
- [ ] Actualizar addPayment con createdBy y createdByAdmin

### Fase 5: Filtrado y Permisos

- [ ] Filtrar shared expenses por permisos en sharedExpenseList
- [ ] Mostrar badges Admin/Participante
- [ ] Deshabilitar delete si no tiene permisos
- [ ] Implementar validación de cerrar shared expense

### Fase 6: Gestión de Participantes

- [ ] Crear ManageParticipants component
- [ ] Implementar inviteByEmail
- [ ] Implementar generateInvitationLink
- [ ] Crear JoinSharedExpense component

### Fase 7: Security Rules

- [ ] Aplicar reglas de seguridad en Firestore
- [ ] Probar que solo admins pueden eliminar expenses de otros
- [ ] Probar que participantes solo pueden eliminar sus propios expenses

### Fase 8: Testing

- [ ] Probar flujo completo de login
- [ ] Probar crear shared expense
- [ ] Probar agregar expense (admin y participante)
- [ ] Probar eliminar expense (con/sin permisos)
- [ ] Probar invitar por email
- [ ] Probar invitar por link
- [ ] Probar cerrar shared expense

## 🎯 Recomendación para Agregar Participantes

**Implementa ambas opciones:**

1. **Por Email** (Principal): Para invitaciones directas y específicas
2. **Por Link** (Secundario): Para compartir en grupos de WhatsApp, etc.

**Flujo sugerido:**

- Si invitas por email y el usuario existe → agregar inmediatamente
- Si invitas por email y NO existe → crear invitación pendiente
- Al registrarse, auto-aceptar invitaciones pendientes
- Links válidos por 7 días por defecto (configurable)
