claude --resume "argentina-formatting-shared-header"

1. Remove get from firestore.rules

2. Current state: 

 `When user A invites user B by email (not yet signed up): SE is stored with participantEmails: [A.email, B.email], participantUids: [A.uid], participants: [{email: A.email, displayName: A.name, uid: A.uid}, {email: B.email, displayName: B.email}].`

 I wonder if each user can see the displayName they set for the contact, and what happens with their own displayName.
---