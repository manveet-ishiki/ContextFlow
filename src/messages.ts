// Message passing types for type-safe communication between extension contexts

export enum MessageType {
  // Sidepanel -> Background
  MERGE_ALL_WINDOWS = 'MERGE_ALL_WINDOWS',
  DEDUPLICATE_TABS = 'DEDUPLICATE_TABS',
  SAVE_WINDOW_AS_CONTEXT = 'SAVE_WINDOW_AS_CONTEXT',
  RESTORE_CONTEXT = 'RESTORE_CONTEXT',
  HIBERNATE_INACTIVE_TABS = 'HIBERNATE_INACTIVE_TABS',

  // Background -> Sidepanel
  TABS_UPDATED = 'TABS_UPDATED',
  OPERATION_COMPLETE = 'OPERATION_COMPLETE',
  OPERATION_ERROR = 'OPERATION_ERROR',
}

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
}

// Payload type definitions
export interface SaveContextPayload {
  name: string;
  color: string;
}

export interface RestoreContextPayload {
  projectId: string;
}

export interface OperationCompletePayload {
  operation: string;
  success: boolean;
  message?: string;
  data?: any;
}

// Type-safe message creators
export function createMessage<T>(type: MessageType, payload?: T): Message<T> {
  return { type, payload };
}
