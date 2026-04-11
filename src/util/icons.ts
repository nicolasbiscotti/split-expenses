import {
  createIcons,
  LayoutDashboard,
  PlusSquare,
  ArrowRightLeft,
  Clock,
  Receipt,
  BarChart2,
  Scale,
  Users,
  User,
  UserPlus,
  UserCheck,
  Handshake,
  FolderPlus,
  ArrowLeft,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Wallet,
  Mail,
  Loader2,
} from "lucide";

const ICON_SET = {
  LayoutDashboard,
  PlusSquare,
  ArrowRightLeft,
  Clock,
  Receipt,
  BarChart2,
  Scale,
  Users,
  User,
  UserPlus,
  UserCheck,
  Handshake,
  FolderPlus,
  ArrowLeft,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Wallet,
  Mail,
  Loader2,
};

/**
 * Replaces all <i data-lucide="icon-name"> placeholders in the DOM with inline SVGs.
 * Call once after every innerHTML update.
 */
export function renderIcons(): void {
  createIcons({ icons: ICON_SET });
}

/**
 * Returns an <i> placeholder string for use in HTML template strings.
 * The placeholder is replaced with an SVG by renderIcons().
 *
 * @param name  Lucide icon name in kebab-case (e.g. "arrow-left")
 * @param cls   Tailwind size classes (default "w-4 h-4")
 */
export function icon(name: string, cls = "w-4 h-4"): string {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}
