import type AppState from "../../state/AppState";
import type AppStore from "../../store";

/**
 * Render: Pantalla de login
 */
export default function renderLoginScreen(): string {
  return `
    <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div class="max-w-md w-full">
        <!-- Logo y título -->
        <div class="text-center mb-8">
          <div class="text-7xl mb-4">💰</div>
          <h1 class="text-4xl font-bold text-gray-800 mb-2">SplitExpenses</h1>
          <p class="text-gray-600">Gestiona tus gastos compartidos fácilmente</p>
        </div>

        <!-- Card de login -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
            Inicia sesión para continuar
          </h2>

          <!-- Botón de Google Sign-In -->
          <button
            id="google-signin-btn"
            class="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition flex items-center justify-center gap-3 group"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continuar con Google</span>
          </button>

          <!-- Loading state (oculto por defecto) -->
          <div id="login-loading" class="hidden w-full text-center py-3">
            <svg class="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm text-gray-600 mt-2">Iniciando sesión...</p>
          </div>

          <!-- Error message (oculto por defecto) -->
          <div id="login-error" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700"></p>
          </div>
        </div>

        <!-- Info adicional -->
        <div class="mt-8 text-center text-sm text-gray-600">
          <p class="mb-2">✓ Crea y gestiona gastos compartidos</p>
          <p class="mb-2">✓ Divide cuentas automáticamente</p>
          <p>✓ Mantén registro de pagos</p>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center text-xs text-gray-500">
          <p>Al continuar, aceptas nuestros términos de servicio</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup: Maneja el login con Google
 */
export function setupLoginScreen(
  container: HTMLElement,
  _state: AppState,
  store: AppStore
): void {
  const signInButton =
    container.querySelector<HTMLButtonElement>("#google-signin-btn");
  const loadingElement = container.querySelector("#login-loading");
  const errorElement = container.querySelector("#login-error");
  const errorText = errorElement?.querySelector("p");

  // Handler: Login con Google
  const handleGoogleSignIn = async () => {
    if (!signInButton) return;

    // Mostrar loading
    signInButton.classList.add("hidden");
    loadingElement?.classList.remove("hidden");
    errorElement?.classList.add("hidden");

    try {
      // El login se maneja en main.ts a través de onAuthStateChanged
      // Solo necesitamos disparar el evento
      await store.signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);

      // Mostrar error
      if (errorText) {
        errorText.textContent =
          error.message || "Error al iniciar sesión. Intenta de nuevo.";
      }
      errorElement?.classList.remove("hidden");

      // Restaurar botón
      signInButton.classList.remove("hidden");
      loadingElement?.classList.add("hidden");
    }
  };

  // Event listener
  signInButton?.addEventListener("click", handleGoogleSignIn);
}
