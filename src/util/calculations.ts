import type { SharedExpenseParticipant, Balance, Debt } from "../types";

/**
 * Compute per-participant balances from the SE document's aggregate fields.
 * balance[email] = netPaid[email] - totalAmount / N
 * This is correct regardless of pagination — no expense/payment records needed.
 */
export function calculateBalancesFromNetPaid(
  participants: SharedExpenseParticipant[],
  totalAmount: number,
  netPaid: Record<string, number>
): Balance[] {
  const sharePerPerson = participants.length > 0 ? totalAmount / participants.length : 0;
  return participants.map((p) => ({
    email: p.email,
    balance: Math.round(((netPaid[p.email] ?? 0) - sharePerPerson) * 100) / 100,
  }));
}

export function calculateDebts(balances: Balance[]): Debt[] {
  const debts: Debt[] = [];
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b }));
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }));

  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(Math.abs(debtor.balance), creditor.balance);

    debts.push({
      fromEmail: debtor.email,
      toEmail: creditor.email,
      amount: Math.round(settleAmount * 100) / 100,
    });

    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return debts;
}
