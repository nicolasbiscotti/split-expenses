/**
 * Displays a temporary toast notification above the bottom nav bar.
 */
export function showToast(
  message: string,
  type: "success" | "error" = "success"
): void {
  const toast = document.createElement("div");
  toast.className = [
    "fixed bottom-24 left-1/2 -translate-x-1/2",
    "px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg z-50",
    "transition-opacity duration-300",
    type === "success" ? "bg-green-600" : "bg-red-600",
  ].join(" ");
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
