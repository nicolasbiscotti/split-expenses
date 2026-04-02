import "./style.css";
import AppStore from "./store";
import render from "./render";
import AppState from "./state/AppState";
import { authService } from "./firebase/auth";
import type { ViewType } from "./types";

// ==================== INIT ====================
const state = new AppState();
const store = new AppStore(state);

// ==================== GLOBAL FUNCTIONS ====================
declare global {
  interface Window {
    setView: (view: ViewType) => void;
  }
}

// Used by bottomNavBar and sharedExpenseTopBar via inline onclick
window.setView = (view) => {
  state.setCurrentView(view, store);
};

// ==================== START APP ====================
state.subscribeRender(render);

// Auth state drives the entire app lifecycle
authService.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    await store.initializeForUser(firebaseUser);
  } else {
    store.clearUserData();
  }
});
