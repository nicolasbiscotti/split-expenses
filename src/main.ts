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

// ==================== START APP ====================
state.subscribeRender(render);
// NO llamar render() aquí, loadFromStorage() lo hará
