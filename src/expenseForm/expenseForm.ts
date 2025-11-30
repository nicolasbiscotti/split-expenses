import "./style.css";

export function setupExpenseForm(element: HTMLDivElement) {
  const users = [
    { id: "1", name: "Fer" },
    { id: "2", name: "Seba" },
    { id: "3", name: "Nata" },
  ];

  const setForm = () => {
    element.className = "bg-white rounded-lg shadow p-6";

    element.innerHTML = `<h2 class="text-xl font-bold mb-4">Agregar Gasto</h2>
          <form id="expense-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Quién pagó</label>
              <select name="payerId" required class="w-full p-2 border rounded">
                ${users
                  .map((u) => `<option value="${u.id}">${u.name}</option>`)
                  .join("")}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Monto</label>
              <input type="number" name="amount" step="0.01" required class="w-full p-2 border rounded" placeholder="0.00">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" name="description" required class="w-full p-2 border rounded" placeholder="Ej: Cena">
            </div>
            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded font-medium">Guardar</button>
              <button type="button" onclick="setView('dashboard')" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium">Cancelar</button>
            </div>
          </form>`;
  };

  setForm();
}
