import type AppState from "../../state/AppState";
import type AppStore from "../../store";

export default function renderInviteDetail(
  state: AppState,
  store: AppStore
): string {
  const seId = state.getPendingInviteSeId();
  const se = seId ? store.getSharedExpense(seId) : null;

  if (!se) {
    return `<div class="text-center p-8 text-gray-500">Invitación no encontrada.</div>`;
  }

  const participantCount = se.participants?.length ?? 0;
  const creator = se.participants?.find((p) => p.uid === se.creatorUid);
  const creatorName = creator?.displayName ?? creator?.email ?? "Desconocido";

  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div class="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <div class="text-center mb-6">
          <span class="text-4xl">📬</span>
          <h2 class="text-xl font-bold text-gray-800 mt-2">Nueva invitación</h2>
          <p class="text-sm text-gray-500 mt-1">Te han agregado a un grupo</p>
        </div>

        <div class="space-y-3 mb-6">
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Grupo</p>
            <p class="font-semibold text-gray-800">${se.name}</p>
            ${se.description ? `<p class="text-sm text-gray-600 mt-1">${se.description}</p>` : ""}
          </div>

          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Creado por</p>
            <p class="font-medium text-gray-800">${creatorName}</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Participantes</p>
            <p class="font-medium text-gray-800">
              👥 ${participantCount} persona${participantCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            id="back-to-list-btn"
            class="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Volver
          </button>
          <button
            id="join-group-btn"
            class="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Unirse al grupo
          </button>
        </div>
      </div>
    </div>
  `;
}

export function setupInviteDetail(
  container: HTMLElement,
  state: AppState,
  store: AppStore
): void {
  const joinBtn = container.querySelector<HTMLButtonElement>("#join-group-btn");
  const backBtn = container.querySelector<HTMLButtonElement>("#back-to-list-btn");

  joinBtn?.addEventListener("click", async () => {
    const seId = state.getPendingInviteSeId();
    if (!seId) return;
    joinBtn.disabled = true;
    joinBtn.textContent = "Uniéndose...";
    try {
      await store.acceptInvite(seId);
      state.setPendingInviteSeId(null);
    } catch (err) {
      console.error("Failed to accept invite:", err);
      joinBtn.disabled = false;
      joinBtn.textContent = "Unirse al grupo";
    }
  });

  backBtn?.addEventListener("click", () => {
    state.setPendingInviteSeId(null);
    state.setCurrentView("shared-expense-list", store);
  });
}
