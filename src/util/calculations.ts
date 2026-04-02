import type { SharedExpenseParticipant, Expense, Payment, Balance, Debt } from "../types";

export function calculateBalances(
  participants: SharedExpenseParticipant[],
  expenses: Expense[],
  payments: Payment[]
): Balance[] {
  const balances = new Map<string, number>();
  participants.forEach((p) => balances.set(p.email, 0));

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const sharePerPerson = totalExpenses / participants.length;
  participants.forEach((p) => balances.set(p.email, -sharePerPerson));

  expenses.forEach((expense) => {
    const current = balances.get(expense.payerEmail) ?? 0;
    balances.set(expense.payerEmail, current + expense.amount);
  });

  payments.forEach((payment) => {
    const fromBalance = balances.get(payment.fromEmail) ?? 0;
    const toBalance = balances.get(payment.toEmail) ?? 0;
    balances.set(payment.fromEmail, fromBalance + payment.amount);
    balances.set(payment.toEmail, toBalance - payment.amount);
  });

  return Array.from(balances.entries()).map(([email, balance]) => ({
    email,
    balance: Math.round(balance * 100) / 100,
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
