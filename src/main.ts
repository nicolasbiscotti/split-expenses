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
  }
};

window.deletePayment = (id: string) => {
  if (confirm("¿Eliminar este pago?")) {
    store.deletePayment(id);
  }
};

// Event delegation for forms
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;

  if (form.id === "expense-form") {
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

  if (form.id === "payment-form") {
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

/*
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
    <div id="expense-form-wrapper"></div>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
setupExpenseForm(
  document.querySelector<HTMLDivElement>("#expense-form-wrapper")!
);

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form !== null && form.id === "expense-form") {
    const formData = new FormData(form);
    const amount: string = formData.get("amount")?.toString()!;

    const expense = {
      id: Date.now().toString(),
      payerId: formData.get("payerId"),
      amount: parseFloat(amount),
      description: formData.get("description"),
      date: new Date().toISOString(),
    };

    console.log("expense ==> ", expense);
  }

  setupExpenseForm(
    document.querySelector<HTMLDivElement>("#expense-form-wrapper")!
  );
});
*/
