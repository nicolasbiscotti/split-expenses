import { Timestamp } from "firebase/firestore";
import type { AppNotification, NotificationType } from "../types";

export function buildDocNotification(
  docData: {
    unreadBy?: string[];
    createdAt: Timestamp;
    amount?: number;
    description?: string;
    fromEmail?: string;
    toEmail?: string;
  },
  docId: string,
  type: NotificationType,
  seId: string,
  seName: string,
  currentUserUid: string,
  listenerStart: Timestamp
): { notification: AppNotification; isRealtime: boolean } | null {
  if (!docData.unreadBy?.includes(currentUserUid)) return null;

  const isRealtime = docData.createdAt.toMillis() > listenerStart.toMillis();

  const message =
    type === "expense_added"
      ? `${seName}: nuevo gasto '${docData.description ?? ""}'`
      : `${seName}: pago de $${docData.amount ?? 0} registrado`;

  return {
    notification: {
      id: docId,
      type,
      seId,
      seName,
      message,
      createdAt: docData.createdAt,
    },
    isRealtime,
  };
}
