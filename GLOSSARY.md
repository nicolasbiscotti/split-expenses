# Split Expenses

People who share costs record what each of them spent, and the app tells them who owes whom so they can settle up. Canonical terms are in English; the Spanish word shown in the UI follows each definition.

## People

**User**:
A person signed in with a Google account. UI: "usuario".
_Avoid_: Account, Member

**Contact**:
Another User saved in a User's personal address book, used to pick Participants quickly. UI: "contacto".
_Avoid_: Friend

**Participant**:
A person taking part in one Shared Expense, identified by email. A Participant may not have signed up yet and still counts fully in the split. UI: "participante".
_Avoid_: Member, Guest, Friend

**Pending Participant**:
A Participant whose email is not yet linked to a User.
_Avoid_: Invitee, Unregistered user

**Creator**:
The User who created a Shared Expense; can edit or delete any Expense or Payment in it.
_Avoid_: Admin, Owner

**Invite**:
What a Pending Participant sees after signing in, telling them they were added to a Shared Expense. UI: "invitación".

**Join**:
Accepting an Invite, which links the Participant to the User.
_Avoid_: Accept, Register

## Shared Expenses

**Shared Expense**:
A set of costs shared among a fixed list of Participants, settled among themselves. Abbreviated **SE**. UI: "gasto compartido".
_Avoid_: Group, Project, Event

**Unique Shared Expense**:
A Shared Expense for a one-off occasion (a trip, a dinner) that is settled once and then Closed. UI: "único".
_Avoid_: One-time, Single

**Recurring Shared Expense**:
A Shared Expense for ongoing costs (a household's monthly bills) whose Participants carry over from one cycle to the next. UI: "recurrente".
_Avoid_: Periodic, Monthly

**Period**:
One cycle (usually a month) of a Recurring Shared Expense, Closed on its own while the Participants carry over to the next. Still being designed.
_Avoid_: Cycle, Month, Round

**Settled**:
The state in which every Balance is zero. Being Settled does not Close anything: more Expenses may still come.
_Avoid_: Paid off, Done

**Closed**:
The state of a Unique Shared Expense or a Period that no longer accepts Expenses. Only the Creator Closes. A Closed Unique Shared Expense still accepts Payments until it is Settled; a Closed Period accepts nothing, because its non-zero Balances carry over into the next Period. UI: "cerrado".
_Avoid_: Archived, Finished

## Money

**Expense**:
Money one Participant spent on behalf of the Shared Expense, split equally among all its Participants. UI: "gasto".
_Avoid_: Cost, Purchase, Charge

**Payer**:
The Participant who spent the money of an Expense. UI: "quién pagó".
_Avoid_: Buyer, Spender

**Recorder**:
The User who entered an Expense or Payment into the app; may differ from the Payer or the Participants of a Payment.
_Avoid_: Author, Creator (Creator is reserved for the Shared Expense)

**Payment**:
Money one Participant actually handed to another to reduce what they owe. UI: "pago".
_Avoid_: Transfer, Settlement, Reimbursement

**Balance**:
A Participant's position in a Shared Expense: what they paid minus their equal share. Positive means they are owed; negative means they owe. UI: "balance".
_Avoid_: Net, Saldo

**Debt**:
A suggested "this Participant owes that Participant this amount", derived from Balances to minimise the number of Payments. Never recorded.
_Avoid_: Transfer, IOU, Settlement

**Settling up**:
Making the Payments suggested by the Debts until every Balance is zero. UI: "saldar cuentas".
_Avoid_: Clearing, Squaring up
