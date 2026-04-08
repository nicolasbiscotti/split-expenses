/**
 * Displays a temporary toast notification above the bottom nav bar.
 */
export function showToast(
  message: string,
  type: "success" | "error" | "info" = "success"
): void {
  const toast = document.createElement("div");
  const bgColor =
    type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600";
  toast.className = [
    "fixed bottom-24 left-1/2 -translate-x-1/2",
    "px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg z-50",
    "transition-opacity duration-300",
    bgColor,
  ].join(" ");
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
