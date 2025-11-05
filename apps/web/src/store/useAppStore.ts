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

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('Unable to read localStorage key', key, error);
    return null;
  }
}

function writeLocalStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('Unable to write localStorage key', key, error);
  }
}

const initialApiBaseUrl = readLocalStorage('apiBaseUrl') ?? DEFAULT_API_BASE;
const initialApiToken = readLocalStorage('apiToken') ?? '';

export const useAppStore = create<AppState>((set) => ({
  apiBaseUrl: initialApiBaseUrl,
  apiToken: initialApiToken,
  statusFilter: 'all',
  setApiBaseUrl: (apiBaseUrl) => {
    writeLocalStorage('apiBaseUrl', apiBaseUrl);
    set({ apiBaseUrl });
  },
  setApiToken: (apiToken) => {
    writeLocalStorage('apiToken', apiToken || null);
    set({ apiToken });
  },
  setStatusFilter: (statusFilter) => set({ statusFilter })
}));
