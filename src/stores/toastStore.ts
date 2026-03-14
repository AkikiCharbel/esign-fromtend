import { create } from 'zustand';
import type { ToastVariant } from '@/components/ui/Toast';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, variant: ToastVariant) => void;
  removeToast: (id: string) => void;
}

let counter = 0;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, variant) => {
    const id = `toast-${++counter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export { useToastStore };
export type { ToastItem };
