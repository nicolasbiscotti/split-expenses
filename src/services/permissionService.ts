import type {
  SharedExpense,
  Expense,
  Payment,
  Balance,
  UserPermissions,
  CloseValidation,
} from "../types";

/**
 * Calcular permisos de un usuario en un shared expense
 */
export function calculateUserPermissions(
  sharedExpense: SharedExpense,
  currentUserId: string
): UserPermissions {
  const isAdmin = sharedExpense.administrators.includes(currentUserId);
  const isParticipant = sharedExpense.participants.includes(currentUserId);

  return {
    isAdmin,
    isParticipant,
    canViewSharedExpense: isAdmin || isParticipant,
    canCreateExpense: isAdmin || isParticipant,
    canCreateExpenseForOthers: isAdmin,
    canDeleteOwnExpense: isAdmin || isParticipant,
    canDeleteAnyExpense: isAdmin,
    canCreatePayment: isAdmin || isParticipant,
    canCreatePaymentForOthers: isAdmin,
    canDeleteOwnPayment: isAdmin || isParticipant,
    canDeleteAnyPayment: isAdmin,
    canAddParticipants: isAdmin,
    canCloseSharedExpense: isAdmin,
  };
}

/**
 * Verificar si un usuario puede eliminar un gasto específico
 */
export function canDeleteExpense(
  expense: Expense,
  sharedExpense: SharedExpense,
  currentUserId: string
): boolean {
  const permissions = calculateUserPermissions(sharedExpense, currentUserId);

  // Admin puede eliminar cualquier gasto
  if (permissions.isAdmin) {
    return true;
  }

  // Participante solo puede eliminar sus propios gastos NO creados por admin
  if (permissions.isParticipant) {
    return expense.createdBy === currentUserId && !expense.createdByAdmin;
  }

  return false;
}

/**
 * Verificar si un usuario puede eliminar un pago específico
 */
export function canDeletePayment(
  payment: Payment,
  sharedExpense: SharedExpense,
  currentUserId: string
): boolean {
  const permissions = calculateUserPermissions(sharedExpense, currentUserId);

  // Admin puede eliminar cualquier pago
  if (permissions.isAdmin) {
    return true;
  }

  // Participante solo puede eliminar sus propios pagos NO creados por admin
  if (permissions.isParticipant) {
    return payment.createdBy === currentUserId && !payment.createdByAdmin;
  }

  return false;
}

/**
 * Validar si se puede cerrar un shared expense
 */
export function validateCloseSharedExpense(
  sharedExpense: SharedExpense,
  currentUserId: string,
  expenses: Expense[],
  balances: Balance[]
): CloseValidation {
  const reasons: string[] = [];

  // 1. Verificar que sea admin
  if (!sharedExpense.administrators.includes(currentUserId)) {
    reasons.push(
      "Solo los administradores pueden cerrar este gasto compartido"
    );
    return { canClose: false, reasons };
  }

  // 2. Verificar que haya al menos un gasto
  const expensesInShared = expenses.filter(
    (e) => e.sharedExpenseId === sharedExpense.id
  );

  if (expensesInShared.length === 0) {
    reasons.push("Debe haber al menos un gasto registrado");
  }

  // 3. Verificar que todos los balances estén en cero
  const balancesNotZero = balances.filter((b) => Math.abs(b.balance) >= 0.01);

  if (balancesNotZero.length > 0) {
    reasons.push("Todos los balances deben estar en cero antes de cerrar");
  }

  return {
    canClose: reasons.length === 0,
    reasons,
  };
}

/**
 * Verificar si un usuario puede agregar participantes
 */
export function canAddParticipants(
  sharedExpense: SharedExpense,
  currentUserId: string
): boolean {
  return sharedExpense.administrators.includes(currentUserId);
}

/**
 * Verificar si un usuario puede ver un shared expense
 */
export function canViewSharedExpense(
  sharedExpense: SharedExpense,
  currentUserId: string
): boolean {
  return (
    sharedExpense.administrators.includes(currentUserId) ||
    sharedExpense.participants.includes(currentUserId)
  );
}

/**
 * Filtrar shared expenses que el usuario puede ver
 */
export function filterVisibleSharedExpenses(
  sharedExpenses: SharedExpense[],
  currentUserId: string
): SharedExpense[] {
  return sharedExpenses.filter((se) => canViewSharedExpense(se, currentUserId));
}

/**
 * Obtener el rol de un usuario en un shared expense
 */
export function getUserRole(
  sharedExpense: SharedExpense,
  userId: string
): "administrator" | "participant" | null {
  if (sharedExpense.administrators.includes(userId)) {
    return "administrator";
  }

  if (sharedExpense.participants.includes(userId)) {
    return "participant";
  }

  return null;
}

/**
 * Verificar si todos los participantes son admins
 */
export function areAllParticipantsAdmins(
  sharedExpense: SharedExpense
): boolean {
  return sharedExpense.participants.every((p) =>
    sharedExpense.administrators.includes(p)
  );
}
