import {
  expenseService,
  participantService,
  paymentService,
} from "./services/databaseService";
import type {
  Participant,
  Expense,
  Payment,
  SharedExpense,
  ViewType,
} from "./types";

type Render = (currentView: ViewType, store: AppStore) => any;

export default class AppStore {
  private participants: Participant[] = [];
  private expenses: Expense[] = [];
  private payments: Payment[] = [];
  private sharedExpenses: SharedExpense[] = [];
  private currentSharedExpenseId: string | null = null;
  private renderList: Render[] = [];

  constructor() {
    this.loadFromStorage();
  }

  getParticipants() {
    return [...this.participants];
  }
  addParticipant(participant: Participant): void {}

  getExpenses() {
    return [...this.expenses];
  }
  addExpense(expense: Expense, currentView: ViewType, store: AppStore) {
    expenseService
      .createExpense(expense)
      .then((expenseId) => {
        expense.id = expenseId;
        this.expenses.push(expense);
        console.log("expense created id ==> ", expenseId);
      })
      .catch((error) => console.log("fail to create the expense ==> ", error))
      .finally(() => this.notifyRender(currentView, store));
  }

  deleteExpense(id: string, currentView: ViewType, store: AppStore) {
    expenseService
      .deleteExpense(id)
      .then(() => {
        this.expenses = this.expenses.filter((e) => e.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.notifyRender(currentView, store));
  }

  getPayments() {
    return [...this.payments];
  }
  addPayment(payment: Payment, currentView: ViewType, store: AppStore) {
    paymentService
      .createPayment(payment)
      .then((paymentId) => {
        payment.id = paymentId;
        this.payments.push(payment);
        console.log("payment created id ==> ", paymentId);
      })
      .catch((error) => console.log("fail to create the payment ==> ", error))
      .finally(() => this.notifyRender(currentView, store));
  }
  deletePayment(id: string, currentView: ViewType, store: AppStore) {
    paymentService
      .deletePayment(id)
      .then(() => {
        this.payments = this.payments.filter((p) => p.id !== id);
      })
      .catch((error) => console.log("fail to delete the expense ==> ", error))
      .finally(() => this.notifyRender(currentView, store));
  }

  // Shared Expenses
  getCurrentSharedExpenseId(): string | null {
    return this.currentSharedExpenseId;
  }
  getSharedExpense(id: string): SharedExpense | undefined {
    return this.sharedExpenses.find((se) => se.id === id);
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
  //     .finally(() => this.notifyRender("dashboard", this));
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
      .finally(() => this.notifyRender("dashboard", this));
  }

  subscribeRender(render: Render): () => void {
    this.renderList.push(render);

    // return the unsubscribe function
    return () => {
      this.renderList = this.renderList.filter((r: any) => r !== render);
    };
  }

  private notifyRender(currentView: ViewType, store: AppStore) {
    this.renderList.forEach((render: Render) => render(currentView, store));
  }
}
