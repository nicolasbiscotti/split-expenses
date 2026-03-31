A new User login with Google
Goes to Profile 
Create a new Contact
Goes to My Expenses and create a new SE
In step 2 of 3 select the existing contact and continue
Click Crete SE button and this error appears in the console:
```
Failed to create shared expense: FirebaseError: Function addDoc() called with invalid data. Unsupported field value: undefined (found in document environments/development/sharedExpenses/ZUIfoxKKGbz0uzZ1mytF) store.ts:248:15
    createSharedExpense store.ts:248
    setupCreateStep3 createStep3.ts:143
    (Async: EventListener.handleEvent)
    setupCreateStep3 createStep3.ts:108
    setupViewInteractions render.ts:172
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    goToNextStep AppState.ts:47
    setupCreateStep2 createStep2.ts:131
    (Async: EventListener.handleEvent)
    setupCreateStep2 createStep2.ts:129
    setupViewInteractions render.ts:164
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    toggleParticipantInNew AppState.ts:92
    setupCreateStep2 createStep2.ts:144
    (Async: EventListener.handleEvent)
    setupCreateStep2 createStep2.ts:138
    setupCreateStep2 createStep2.ts:137
    setupViewInteractions render.ts:164
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    goToNextStep AppState.ts:47
    handleSubmit createStep1.ts:138
    (Async: EventListener.handleEvent)
    setupCreateStep1 createStep1.ts:155
    setupViewInteractions render.ts:156
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    setCurrentView AppState.ts:31
    startCreateFlow AppState.ts:145
    handleStartCreate sharedExpenseList.ts:148
    (Async: EventListener.handleEvent)
    setupSharedExpenseList sharedExpenseList.ts:160
    setupViewInteractions render.ts:148
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    setCurrentView AppState.ts:31
    setView main.ts:21
    onclick (index):1
Failed to create shared expense: FirebaseError: Function addDoc() called with invalid data. Unsupported field value: undefined (found in document environments/development/sharedExpenses/ZUIfoxKKGbz0uzZ1mytF) createStep3.ts:148:15
    setupCreateStep3 createStep3.ts:148
    setupCreateStep3 createStep3.ts:108
    setupViewInteractions render.ts:172
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    goToNextStep AppState.ts:47
    setupCreateStep2 createStep2.ts:131
    (Async: EventListener.handleEvent)
    setupCreateStep2 createStep2.ts:129
    setupViewInteractions render.ts:164
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    toggleParticipantInNew AppState.ts:92
    setupCreateStep2 createStep2.ts:144
    (Async: EventListener.handleEvent)
    setupCreateStep2 createStep2.ts:138
    setupCreateStep2 createStep2.ts:137
    setupViewInteractions render.ts:164
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    goToNextStep AppState.ts:47
    handleSubmit createStep1.ts:138
    (Async: EventListener.handleEvent)
    setupCreateStep1 createStep1.ts:155
    setupViewInteractions render.ts:156
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    setCurrentView AppState.ts:31
    startCreateFlow AppState.ts:145
    handleStartCreate sharedExpenseList.ts:148
    (Async: EventListener.handleEvent)
    setupSharedExpenseList sharedExpenseList.ts:160
    setupViewInteractions render.ts:148
    render render.ts:89
    notify AppState.ts:183
    notify AppState.ts:183
    setCurrentView AppState.ts:31
    setView main.ts:21
    onclick (index):1

```
and also this alert: Hubo un error al crear el gasto compartido. Por favor intenta de nuevo.

No SE created on firestore.

Note: if go back to step 2 deselect the existing and add it from inline create contact, the SE is created without errors.
