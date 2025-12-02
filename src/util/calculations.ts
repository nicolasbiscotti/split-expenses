import type { Participant, Expense, Payment, Balance, Debt } from "../types";

export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
  payments: Payment[]
) {
  const balances = new Map();
  participants.forEach((participant) => balances.set(participant.id, 0));

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const sharePerPerson = totalExpenses / participants.length;
  participants.forEach((participant) => balances.set(participant.id, -sharePerPerson));

  expenses.forEach((expense) => {
    const current = balances.get(expense.payerId) || 0;
    balances.set(expense.payerId, current + expense.amount);
  });

  payments.forEach((payment) => {
    const fromBalance = balances.get(payment.fromId) || 0;
    const toBalance = balances.get(payment.toId) || 0;
    balances.set(payment.fromId, fromBalance + payment.amount);
    balances.set(payment.toId, toBalance - payment.amount);
  });

  return Array.from(balances.entries()).map(([participantId, balance]) => ({
    participantId,
    balance: Math.round(balance * 100) / 100,
  }));
}

export function calculateDebts(balances: Balance[]) {
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
      fromId: debtor.participantId,
      toId: creditor.participantId,
      amount: Math.round(settleAmount * 100) / 100,
    });

    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return debts;
}
