import { create } from 'zustand';

type StatusFilter = 'all' | 'queued' | 'done' | 'skipped';

type AppState = {
  apiBaseUrl: string;
  apiToken: string;
  statusFilter: StatusFilter;
  setApiBaseUrl: (url: string) => void;
  setApiToken: (token: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
};

export const useAppStore = create<AppState>((set) => ({
  apiBaseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:4000',
  apiToken: '',
  statusFilter: 'all',
  setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
  setApiToken: (apiToken) => set({ apiToken }),
  setStatusFilter: (statusFilter) => set({ statusFilter })
}));
