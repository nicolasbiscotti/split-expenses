import "./style.css";
import AppStore from "./store";
import render from "./render";
import AppState from "./state/AppState";
import type { ViewType } from "./types";

// ==================== INIT ====================
const state = new AppState();
const store = new AppStore(state);

// ==================== GLOBAL FUNCTIONS ====================
declare global {
  interface Window {
    setView: (view: ViewType) => void;
    deleteExpense: (id: string) => void;
    deletePayment: (id: string) => void;
  }
}

window.setView = (view) => {
  state.setCurrentView(view, store);
};

// NOTA: Estas funciones ahora están en setupHistory
// pero las mantenemos aquí para compatibilidad con onclick inline
window.deleteExpense = (id: string) => {
  if (confirm("¿Eliminar este gasto?")) {
    store.deleteExpense(id, "history");
  }
};

window.deletePayment = (id: string) => {
  if (confirm("¿Eliminar este pago?")) {
    store.deletePayment(id, "history");
  }
};

// ==================== FORM SUBMISSIONS ====================
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;

  // Expense Form
  if (form.id === "expense-form") {
    const formData = new FormData(form);
    const currentExpenseId = store.getCurrentSharedExpenseId();

    if (!currentExpenseId) {
      alert("No hay un gasto compartido seleccionado");
      return;
    }

    try {
      await store.addExpense(
        {
          id: "",
          sharedExpenseId: currentExpenseId,
          payerId: formData.get("payerId") as string,
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          date: new Date().toISOString(),
        },
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
    const currentExpenseId = store.getCurrentSharedExpenseId();

    if (!currentExpenseId) {
      alert("No hay un gasto compartido seleccionado");
      return;
    }

    if (fromId === toId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    try {
      await store.addPayment(
        {
          id: "",
          sharedExpenseId: currentExpenseId,
          fromId,
          toId,
          amount: parseFloat(formData.get("amount") as string),
          date: new Date().toISOString(),
        },
        "dashboard"
      );
    } catch (error) {
      alert("Error al registrar el pago");
    }
  }
});

// ==================== START APP ====================
state.subscribeRender(render);
// NO llamar render() aquí, loadFromStorage() lo hará
