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

    const currentUserContact = store.getCurrentUserContact();
    const isAdmin = currentUserContact
      ? sharedExpense.adminContactIds.includes(currentUserContact.id)
      : false;

    try {
      await store.addExpense(
        {
          sharedExpenseId: currentExpenseId!,
          payerContactId: formData.get("payerContactId") as string, // Updated field name
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          date: new Date().toISOString(),

          // Audit
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
    const fromContactId = formData.get("fromContactId") as string; // Updated field name
    const toContactId = formData.get("toContactId") as string; // Updated field name
    const currentUser = store.getCurrentUser();
    const currentExpenseId = store.getCurrentSharedExpenseId();
    const sharedExpense = store.getSharedExpense(currentExpenseId!);

    if (!currentUser || !sharedExpense) {
      alert("Error: Usuario o gasto compartido no encontrado");
      return;
    }

    if (fromContactId === toContactId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    const currentUserContact = store.getCurrentUserContact();
    const isAdmin = currentUserContact
      ? sharedExpense.adminContactIds.includes(currentUserContact.id)
      : false;

    try {
      await store.addPayment(
        {
          sharedExpenseId: currentExpenseId,
          fromContactId, // Updated field name
          toContactId, // Updated field name
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

// Auth state observer
onAuthStateChange(async (firebaseUser) => {
  if (firebaseUser) {
    console.log("Logged User ==> ", firebaseUser.email);

    const user = firebaseUserToUser(firebaseUser);
    await userService.createOrUpdateUser(user);
    store.setCurrentUser(user);

    await store.loadFromStorage();
  } else {
    console.log("No logged User ==> ");

    store.setCurrentUser(null);
    state.setCurrentView("login", store);
  }
});
