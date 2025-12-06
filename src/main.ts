import "./style.css";
import AppStore from "./store";
import render from "./render";
import type { Expense, Payment, ViewType } from "./types";
import AppState from "./state/AppState";
import type { CreateSharedExpenseEvent } from "./eventEmitters/createSharedExpenseEvent";

declare global {
  interface Window {
    setView: (view: ViewType) => void;
    deleteExpense: (id: string) => void;
    deletePayment: (id: string) => void;
  }
}

// ==================== APP STATE ====================
const state = new AppState();

// ==================== APP STORE ====================
const store = new AppStore(state);

window.setView = (view: ViewType) => {
  // remember that state.setWhatever notify the change to render
  state.setCurrentView(view, store);
};

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

const handleCreateSharedExpense = (
  event: CustomEvent<CreateSharedExpenseEvent>
) => {
  console.log("Event received ==> ", event.detail);
  state.setCurrentView(event.detail.currentView, store);
};

document.addEventListener(
  "createsharedexpense",
  handleCreateSharedExpense as EventListener
);

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
      "dashboard"
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
      "dashboard"
    );
  }
});

state.subscribeRender(render);
render(state, store);
