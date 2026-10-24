import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';
export interface ToastAction { label: string; run: () => void }
export interface Toast { id: number; message: string; tone: ToastTone; action?: ToastAction }

interface PushOptions { tone?: ToastTone; action?: ToastAction; sticky?: boolean }
interface ToastState {
  toasts: Toast[];
  push: (message: string, options?: PushOptions) => number;
  dismiss: (id: number) => void;
}

const MAX_VISIBLE = 3;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, options = {}) => {
    const id = nextId++;
    const toast: Toast = { id, message, tone: options.tone ?? 'info', action: options.action };
    // A repeat of the visible message replaces it instead of stacking.
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.message !== message), toast].slice(-MAX_VISIBLE) }));
    if (!options.sticky) setTimeout(() => get().dismiss(id), options.action ? 6000 : 3200);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (m: string, action?: ToastAction) => useToastStore.getState().push(m, { action }),
  success: (m: string, action?: ToastAction) => useToastStore.getState().push(m, { tone: 'success', action }),
  sticky: (m: string, action?: ToastAction) => useToastStore.getState().push(m, { action, sticky: true }),
  error: (m: string) => useToastStore.getState().push(m, { tone: 'error' }),
};
