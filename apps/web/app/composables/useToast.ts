export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const DISMISS_AFTER_MS = 4000;

export function useToast() {
  const toasts = useState<ToastItem[]>('sg-toasts', () => []);

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function push(type: ToastItem['type'], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    toasts.value = [...toasts.value, { id, type, message }];
    if (import.meta.client) {
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    }
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };
}
