# Custom Events in TypeScript: A Practical Guide

## Example: Dispatching a Custom Event

### 1. Define Event Type for Type Safety (Recommended)

**File: `types.ts` (or within your main script)**

```typescript
// types.ts
interface CustomEventDetail {
  message: string;
  timestamp: number;
}
```

### 2. Create Event Emitter Utility

**File: `eventEmitter.ts`**

```typescript
// eventEmitter.ts
import type { CustomEventDetail } from "./types";

export function dispatchCustomMessageEvent(detail: CustomEventDetail): void {
  // Use the built-in 'CustomEvent' constructor
  const event = new CustomEvent<CustomEventDetail>("customMessage", {
    detail,
    bubbles: true, // Allows the event to bubble up the DOM
    composed: true, // Allows the event to pass through shadow DOM boundaries
  });

  // Dispatch the event on a specific element (e.g., document or window)
  document.dispatchEvent(event);
  console.log('Event "customMessage" dispatched!');
}
```

### 3. Implement Event Listener in Main Application

**File: `main.ts`**

```typescript
// main.ts
import { dispatchCustomMessageEvent } from "./eventEmitter";
import type { CustomEventDetail } from "./types";

// Define the listener function with proper typing
const handleCustomMessage = (event: CustomEvent<CustomEventDetail>) => {
  console.log("Event received:", event.detail.message);
  console.log("Timestamp:", new Date(event.detail.timestamp));
};

// Add the event listener
// Note: Type assertion may be needed for TypeScript
document.addEventListener(
  "customMessage",
  handleCustomMessage as EventListener
);

// Dispatch event after delay to demonstrate functionality
setTimeout(() => {
  dispatchCustomMessageEvent({
    message: "Hello from Vite & TypeScript!",
    timestamp: Date.now(),
  });
}, 1000);
```

## Key Concepts

| Concept                     | Description                                                                                      | TypeScript Benefit                               |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **CustomEvent Constructor** | Standard Web API to create events with specific names and detail payloads [1]                    | Enforces type structure of event details         |
| **dispatchEvent()**         | Method available on `Element`, `Document`, and `Window` objects to trigger events in the DOM [2] | Ensures proper target for event dispatch         |
| **Type Safety**             | TypeScript compatibility that enforces structure of detail objects in event listeners            | Prevents runtime errors with compile-time checks |

## Usage Notes

- **Type Assertion**: TypeScript may require `as EventListener` when adding listeners to built-in elements
- **Bubbling**: Set `bubbles: true` if you need events to propagate up the DOM tree
- **Shadow DOM**: Use `composed: true` for events that need to cross shadow DOM boundaries
- **Multiple Targets**: Events can be dispatched on `document`, `window`, or specific DOM elements

## References

1. [MDN: CustomEvent Constructor](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
2. [MDN: EventTarget.dispatchEvent()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)
