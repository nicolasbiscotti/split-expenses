import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";
import { setupExpenseForm } from "./expenseForm/expenseForm.ts";

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
