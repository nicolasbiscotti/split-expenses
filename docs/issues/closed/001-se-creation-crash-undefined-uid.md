# [BUG] SE creation crash when selecting contact from checkbox

**Type:** bug
**Opened:** 2026-03-31
**Resolved:** 2026-03-31

## Description

A new user logs in with Google, goes to Profile, creates a new contact, navigates to My Expenses and creates a new SE. In step 2 of 3, they select the existing contact via checkbox and click Continue. On step 3, clicking "Create SE" crashes with:

```
FirebaseError: Function addDoc() called with invalid data.
Unsupported field value: undefined (found in document environments/development/sharedExpenses/...)
```

**Note:** if the user goes back to step 2, deselects the existing contact, and adds the same person via the inline "add by email" form, the SE is created without errors.

## Root cause

In `src/components/createSteps/createStep2.ts`, the checkbox `change` handler built the participant object as:

```typescript
uid: checkbox.dataset.uid || undefined,
```

When the contact has no registered UID, `data-uid` is `""` (empty string), which is falsy. So `"" || undefined` evaluated to the literal value `undefined`. Firestore rejects documents containing `undefined` field values.

The inline email form avoided the issue by simply omitting the `uid` key entirely.

## Resolution

Replaced the `uid` assignment with a conditional spread that omits the field when there is no value:

```typescript
...(checkbox.dataset.uid ? { uid: checkbox.dataset.uid } : {}),
```

This makes the checkbox path consistent with the email form path — `uid` is either a real non-empty string or absent from the object entirely.

**Fixed in:** `src/components/createSteps/createStep2.ts`
