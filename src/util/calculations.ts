import type {
  ResolvedContact,
  Expense,
  Payment,
  Balance,
  Debt,
} from "../types";

/**
 * Calculate balances for each participant
 * Now uses contactId instead of participantId
 */
export function calculateBalances(
  participants: ResolvedContact[],
  expenses: Expense[],
  payments: Payment[]
): Balance[] {
  const balances = new Map<string, number>();

  // Initialize all participants with 0
  participants.forEach((participant) => balances.set(participant.id, 0));

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate share per person
  const sharePerPerson =
    participants.length > 0 ? totalExpenses / participants.length : 0;

  // Set each participant's debt (what they owe)
  participants.forEach((participant) =>
    balances.set(participant.id, -sharePerPerson)
  );

  // Add what each person paid
  expenses.forEach((expense) => {
    const current = balances.get(expense.payerContactId) || 0;
    balances.set(expense.payerContactId, current + expense.amount);
  });

  // Process payments
  payments.forEach((payment) => {
    const fromBalance = balances.get(payment.fromContactId) || 0;
    const toBalance = balances.get(payment.toContactId) || 0;
    balances.set(payment.fromContactId, fromBalance + payment.amount);
    balances.set(payment.toContactId, toBalance - payment.amount);
  });

  return Array.from(balances.entries()).map(
    ([participantContactId, balance]) => ({
      participantContactId,
      balance: Math.round(balance * 100) / 100,
    })
  );
}

/**
 * Calculate optimal debts to settle balances
 * Now uses contactId
 */
export function calculateDebts(balances: Balance[]): Debt[] {
  const debts: Debt[] = [];

  // Separate debtors and creditors
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b }));
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }));

  // Sort for optimal matching
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(Math.abs(debtor.balance), creditor.balance);

    debts.push({
      fromContactId: debtor.participantContactId,
      toContactId: creditor.participantContactId,
      amount: Math.round(settleAmount * 100) / 100,
    });

    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return debts;
}

/**
 * Get participant name by contact ID
 */
export function getParticipantName(
  contactId: string,
  participants: ResolvedContact[]
): string {
  const participant = participants.find((p) => p.id === contactId);
  return participant?.displayName || "Desconocido";
}
