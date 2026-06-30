// Shared in-memory task state — lost on restart (frontend handles gracefully)

export type GenStatus = 'pending' | 'running' | 'done' | 'failed';

export interface GenTask {
  id: string;
  status: GenStatus;
  imageUrl?: string;
  promptUsed?: string;
  error?: string;
  createdAt: number;
  // KIE task tracking
  kieTaskId?: string;
  // Style variant for multi-variation generation
  styleVariant?: string;
}

export const tasks = new Map<string, GenTask>();

// Search state
export type SearchStatus = 'running' | 'done' | 'failed';

export interface SearchState {
  id: string;
  status: SearchStatus;
  apifyRunId?: string;
  datasetId?: string;
  ads?: any[];
  error?: string;
  createdAt: number;
}

export const searches = new Map<string, SearchState>();
