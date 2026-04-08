import { describe, it, expect } from "vitest";
import { buildDocNotification } from "./notificationBuilders";
import { Timestamp } from "firebase/firestore";

const now = Timestamp.now();
const earlier = Timestamp.fromMillis(now.toMillis() - 5000);
const later = Timestamp.fromMillis(now.toMillis() + 5000);
const uid = "uid-alice";

describe("buildDocNotification", () => {
  it("returns null when the doc is not in the user's unreadBy", () => {
    expect(
      buildDocNotification(
        { unreadBy: ["uid-bob"], createdAt: later, amount: 50, description: "Café" },
        "exp1",
        "expense_added",
        "se1",
        "Viaje",
        uid,
        now
      )
    ).toBeNull();
  });

  it("returns null when unreadBy is empty", () => {
    expect(
      buildDocNotification(
        { unreadBy: [], createdAt: later, amount: 50, description: "Café" },
        "exp1",
        "expense_added",
        "se1",
        "Viaje",
        uid,
        now
      )
    ).toBeNull();
  });

  it("returns catch-up notification (isRealtime false) for doc created before listenerStart", () => {
    const result = buildDocNotification(
      { unreadBy: [uid], createdAt: earlier, amount: 50, description: "Café" },
      "exp1",
      "expense_added",
      "se1",
      "Viaje",
      uid,
      now
    );
    expect(result).not.toBeNull();
    expect(result?.isRealtime).toBe(false);
    expect(result?.notification.type).toBe("expense_added");
    expect(result?.notification.message).toContain("Café");
    expect(result?.notification.id).toBe("exp1");
    expect(result?.notification.seId).toBe("se1");
  });

  it("returns realtime notification (isRealtime true) for doc created after listenerStart", () => {
    const result = buildDocNotification(
      { unreadBy: [uid], createdAt: later, amount: 50, description: "Café" },
      "exp1",
      "expense_added",
      "se1",
      "Viaje",
      uid,
      now
    );
    expect(result?.isRealtime).toBe(true);
  });

  it("builds a payment notification with the right type", () => {
    const result = buildDocNotification(
      {
        unreadBy: [uid],
        createdAt: later,
        amount: 30,
        fromEmail: "bob@x.com",
        toEmail: "alice@x.com",
      },
      "pay1",
      "payment_added",
      "se1",
      "Viaje",
      uid,
      now
    );
    expect(result?.notification.type).toBe("payment_added");
    expect(result?.notification.message).toContain("30");
  });
});
