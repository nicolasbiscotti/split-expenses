import "./style.css";
import AppStore from "./store";
import render from "./render";
import AppState from "./state/AppState";
import { onAuthStateChange, firebaseUserToUser } from "./auth/authService";
import { userService } from "./services/userService";
import type { Expense, Payment, ViewType } from "./types";

// ==================== INIT ====================
const state = new AppState();
const store = new AppStore(state);

// ==================== GLOBAL FUNCTIONS ====================
declare global {
  interface Window {
    setView: (view: ViewType) => void;
    deleteExpense: (id: string) => void;
    deletePayment: (id: string) => void;
    selectSharedExpense: (id: string) => void;
  }
}

window.setView = (view) => {
  state.setCurrentView(view, store);
};

window.selectSharedExpense = async (id: string) => {
  await store.setCurrentSharedExpenseId(id);
  state.setCurrentView("dashboard", store);
};

// // NOTA: Estas funciones ahora están en setupHistory
// // pero las mantenemos aquí para compatibilidad con onclick inline
// window.deleteExpense = (id: string) => {
//   if (confirm("¿Eliminar este gasto?")) {
//     store.deleteExpense(id, "history");
//   }
// };

// window.deletePayment = (id: string) => {
//   if (confirm("¿Eliminar este pago?")) {
//     store.deletePayment(id, "history");
//   }
// };

// ==================== FORM SUBMISSIONS ====================
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;

  // Expense Form
  if (form.id === "expense-form") {
    const formData = new FormData(form);
    const currentUser = store.getCurrentUser();
    const currentExpenseId = store.getCurrentSharedExpenseId();
    const sharedExpense = store.getSharedExpense(currentExpenseId!);

    if (!currentUser || !sharedExpense) {
      alert("Error: Usuario o gasto compartido no encontrado");
      return;
    }

    const isAdmin = sharedExpense.administrators.includes(currentUser.uid);

    try {
      await store.addExpense(
        {
          sharedExpenseId: currentExpenseId!,
          payerId: formData.get("payerId") as string,
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          date: new Date().toISOString(),

          // NUEVO: Auditoría
          createdBy: currentUser.uid,
          createdByAdmin: isAdmin,
        } as Expense,
        "dashboard"
      );
    } catch (error) {
      alert("Error al agregar el gasto");
    }
  }

  // Payment Form
  if (form.id === "payment-form") {
    const formData = new FormData(form);
    const fromId = formData.get("fromId") as string;
    const toId = formData.get("toId") as string;
    const currentUser = store.getCurrentUser();
    const currentExpenseId = store.getCurrentSharedExpenseId();
    const sharedExpense = store.getSharedExpense(currentExpenseId!);

    if (!currentUser || !sharedExpense) {
      alert("Error: Usuario o gasto compartido no encontrado");
      return;
    }

    if (fromId === toId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    const isAdmin = sharedExpense.administrators.includes(currentUser.uid);

    try {
      await store.addPayment(
        {
          sharedExpenseId: currentExpenseId,
          fromId,
          toId,
          amount: parseFloat(formData.get("amount") as string),
          date: new Date().toISOString(),
          createdBy: currentUser.uid,
          createdByAdmin: isAdmin,
        } as Payment,
        "dashboard"
      );
    } catch (error) {
      alert("Error al registrar el pago");
    }
  }
});

// ==================== START APP ====================
state.subscribeRender(render);
// store.startApp();

// Observer de autenticación
onAuthStateChange(async (firebaseUser) => {
  if (firebaseUser) {
    console.log("Legged User ==> ", firebaseUser.email);

    const user = firebaseUserToUser(firebaseUser);
    await userService.createOrUpdateUser(user);
    store.setCurrentUser(user);

    await store.loadFromStorage();
  } else {
    console.log("No legged User ==> ");

    store.setCurrentUser(null);
    state.setCurrentView("login", store);
  }
});
