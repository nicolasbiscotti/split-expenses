import "./style.css";
import AppStore from "./store";
import render from "./render";
import type { Expense, Payment, ViewType } from "./types";

declare global {
  interface Window {
    setView: (view: ViewType) => void;
    deleteExpense: (id: string) => void;
    deletePayment: (id: string) => void;
  }
}

// Store instance.
const store = new AppStore();

// App state
let currentView: ViewType = "dashboard";

window.setView = (view: ViewType) => {
  currentView = view;
  render(currentView, store);
};

window.deleteExpense = (id: string) => {
  if (confirm("¿Eliminar este gasto?")) {
    store.deleteExpense(id, "history", store);
  }
};

window.deletePayment = (id: string) => {
  if (confirm("¿Eliminar este pago?")) {
    store.deletePayment(id, "history", store);
  }
};

// Event delegation for forms
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;

  if (form.id === "expense-form") {
    const formData = new FormData(form);
    const payerId = formData.get("payerId") as string;
    const amount = formData.get("amount") as string;
    const description = formData.get("description") as string;

    store.addExpense(
      {
        payerId,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString(),
      } as Expense,
      "dashboard",
      store
    );
  }

  if (form.id === "payment-form") {
    const formData = new FormData(form);
    const fromId = formData.get("fromId") as string;
    const toId = formData.get("toId") as string;
    const amount = formData.get("amount") as string;

    if (fromId === toId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    store.addPayment(
      {
        fromId,
        toId,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
      } as Payment,
      "dashboard",
      store
    );
  }
});

store.subscribeRender(render);
render(currentView, store);
