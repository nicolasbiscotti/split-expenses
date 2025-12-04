Example: Dispatching a Custom Event
1. Define the event type for type safety (optional but recommended): 
typescript

// types.ts (or within your main script)
interface CustomEventDetail {
  message: string;
  timestamp: number;
}

2. Create a utility function or class to dispatch the event:
typescript

// eventEmitter.ts
import type { CustomEventDetail } from './types';

export function dispatchCustomMessageEvent(detail: CustomEventDetail): void {
  // Use the built-in 'CustomEvent' constructor
  const event = new CustomEvent<CustomEventDetail>('customMessage', {
    detail,
    bubbles: true, // Allows the event to bubble up the DOM
    composed: true, // Allows the event to pass through shadow DOM boundaries
  });

  // Dispatch the event on a specific element (e.g., document or window)
  document.dispatchEvent(event);
  console.log('Event "customMessage" dispatched!');
}

3. Add an event listener in your main application logic: 
typescript

// main.ts
import { dispatchCustomMessageEvent } from './eventEmitter';
import type { CustomEventDetail } from './types';

// Define the listener function, ensuring the 'event' parameter is correctly typed
const handleCustomMessage = (event: CustomEvent<CustomEventDetail>) => {
  console.log('Event received:', event.detail.message);
  console.log('Timestamp:', new Date(event.detail.timestamp));
};

// Add the event listener
// Note: TypeScript might require a type assertion if you don't use 'addEventListener' frequently on 'document'
document.addEventListener('customMessage', handleCustomMessage as EventListener);


// Dispatch the event after a short delay to prove the listener works
setTimeout(() => {
  dispatchCustomMessageEvent({
    message: 'Hello from Vite & TypeScript!',
    timestamp: Date.now(),
  });
}, 1000);

Key Concepts

    CustomEvent Constructor: This is the standard Web API used to create an event with a specific name and optional detail payload [1].
    dispatchEvent(): This method, available on Element, Document, and Window objects, triggers the event in the DOM [2].
    Type Safety: TypeScript is fully compatible and allows you to enforce the structure of the detail object within your event listener callback. 