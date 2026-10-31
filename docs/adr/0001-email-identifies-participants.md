# Email, not UID, identifies Participants in Expenses and Payments

Expenses and Payments name Participants by email (`paidByEmail`, `fromEmail`, `toEmail`), and per-Participant aggregates on the Shared Expense (`netPaid`) are keyed by email too. A Firebase UID only exists once someone signs in, but the Creator must be able to record Expenses for every Participant right after creating a Shared Expense, including Pending Participants who have never signed in. Email is the only identifier known for all Participants from the start; the UID is attached later, on Join, in `participants` and `participantUids`.

## Consequences

- Security rules check ownership by comparing `request.auth.token.email` with `paidByEmail` / `fromEmail`, so a User's Google email is effectively immutable from the app's point of view. Changing it would require rewriting every Expense, Payment and `netPaid` key.
- Reading sub-collections is gated by UID (`participantUids`), so a Pending Participant must Join before seeing any Expense or Payment.
