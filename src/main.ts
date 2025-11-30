import "./style.css";
import AppStore from "./store";
import render from "./render";

// Store instance
const store = new AppStore();

// App state
let currentView = "dashboard";

window.setView = (view: string) => {
  currentView = view;
  render(currentView, store);
};

window.deleteExpense = (id: string) => {
  if (confirm("¿Eliminar este gasto?")) {
    store.deleteExpense(id);
    currentView = "history";
    render(currentView, store);
  }
};

window.deletePayment = (id: string) => {
  if (confirm("¿Eliminar este pago?")) {
    store.deletePayment(id);
    currentView = "history";
    render(currentView, store);
  }
};

// Event delegation for forms
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;

  if (form !== null && form.id === "expense-form") {
    const formData = new FormData(form);
    store.addExpense({
      id: Date.now().toString(),
      payerId: formData.get("payerId"),
      amount: parseFloat(formData.get("amount")),
      description: formData.get("description"),
      date: new Date().toISOString(),
    });
    currentView = "dashboard";
    render(currentView, store);
  }

  if (form !== null && form.id === "payment-form") {
    const formData = new FormData(form);
    const fromId = formData.get("fromId");
    const toId = formData.get("toId");

    if (fromId === toId) {
      alert("No puedes registrar un pago a la misma persona");
      return;
    }

    store.addPayment({
      id: Date.now().toString(),
      fromId,
      toId,
      amount: parseFloat(formData.get("amount")),
      date: new Date().toISOString(),
    });
    currentView = "dashboard";
    render(currentView, store);
  }
});

store.subscribe(render);
render(currentView, store);
