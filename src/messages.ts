// Message passing types for type-safe communication between extension contexts

export enum MessageType {
  // Content Script -> Background
  PAGE_CONTENT_EXTRACTED = 'PAGE_CONTENT_EXTRACTED',

  // Background -> Offscreen
  GENERATE_EMBEDDING = 'GENERATE_EMBEDDING',

  // Offscreen -> Background
  EMBEDDING_GENERATED = 'EMBEDDING_GENERATED',

  // Sidepanel -> Background
  MERGE_ALL_WINDOWS = 'MERGE_ALL_WINDOWS',
  DEDUPLICATE_TABS = 'DEDUPLICATE_TABS',
  SAVE_WINDOW_AS_CONTEXT = 'SAVE_WINDOW_AS_CONTEXT',
  RESTORE_CONTEXT = 'RESTORE_CONTEXT',
  HIBERNATE_INACTIVE_TABS = 'HIBERNATE_INACTIVE_TABS',
  SEMANTIC_SEARCH = 'SEMANTIC_SEARCH',

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
export interface PageContentPayload {
  url: string;
  title: string;
  h1: string;
  metaDescription: string;
  snippet: string;
}

export interface GenerateEmbeddingPayload {
  url: string;
  text: string;
}

export interface EmbeddingGeneratedPayload {
  url: string;
  vector: number[];
}

export interface SaveContextPayload {
  name: string;
  color: string;
}

export interface RestoreContextPayload {
  projectId: string;
}

export interface SemanticSearchPayload {
  query: string;
  limit?: number;
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
