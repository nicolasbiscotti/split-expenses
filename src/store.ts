import {
  expenseService,
  participantService,
  paymentService,
} from "./services/databaseService";
import type { Participant, Expense, Payment } from "./types";

export default class AppStore {
  participants: Participant[];
  expenses: Expense[];
  payments: Payment[];
  listeners: any;

  constructor() {
    this.participants = [];
    this.expenses = [];
    this.payments = [];
    this.listeners = [];
    this.loadFromStorage();
  }

  getParticipants() {
    return [...this.participants];
  }
  getExpenses() {
    return [...this.expenses];
  }
  getPayments() {
    return [...this.payments];
  }

  addExpense(expense: Expense, currentView: string, store: AppStore) {
    expenseService
      .createExpense(expense)
      .then((expenseId) => {
        expense.id = expenseId;
        this.expenses.push(expense);
        console.log("expense created id ==> ", expenseId);
      })
      .catch((error) => console.log("fail to create the expense ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  deleteExpense(id: string, currentView: string, store: AppStore) {
    expenseService
      .deleteExpense(id)
      .then(() => {
        this.expenses = this.expenses.filter((e) => e.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  addPayment(payment: Payment, currentView: string, store: AppStore) {
    paymentService
      .createPayment(payment)
      .then((paymentId) => {
        payment.id = paymentId;
        this.payments.push(payment);
        console.log("payment created id ==> ", paymentId);
      })
      .catch((error) => console.log("fail to create the payment ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  deletePayment(id: string, currentView: string, store: AppStore) {
    paymentService
      .deletePayment(id)
      .then(() => {
        this.payments = this.payments.filter((p) => p.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.notify(currentView, store));
  }

  // loadFromStorage() {
  //   participantService
  //     .createParticipantList()
  //     .then((participantIds) => {
  //       if (participantIds.length > 0) {
  //         return true;
  //       }
  //       return false;
  //     })
  //     .then((created) => {
  //       if (created) {
  //         return participantService.getParticipants();
  //       }
  //       return [];
  //     })
  //     .then((participants) => {
  //       this.participants = participants;
  //       console.log("participants loaded ==> ", participants);
  //     })
  //     .catch((error) =>
  //       console.log("error loading data from firebase ==> ", error)
  //     )
  //     .finally(() => this.notify("dashboard", this));
  // }

  loadFromStorage() {
    Promise.all([
      expenseService.getExpenses(),
      paymentService.getPayments(),
      participantService.getParticipants(),
    ])
      .then((data) => {
        this.expenses = data[0];
        console.log("expenses loaded ==> ", data[0]);

        this.payments = data[1];
        console.log("payments loaded ==> ", data[1]);

        this.participants = data[2];
        console.log("participants loaded ==> ", data[2]);
      })
      .catch((error) =>
        console.log("error loading data from firebase ==> ", error)
      )
      .finally(() => this.notify("dashboard", this));
  }

  subscribe(listener: (currentView: string, store: AppStore) => any) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l: any) => l !== listener);
    };
  }

  notify(currentView: string, store: AppStore) {
    this.listeners.forEach(
      (listener: (currentView: string, store: AppStore) => any) =>
        listener(currentView, store)
    );
  }
}
