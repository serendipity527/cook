import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  tone?: 'default' | 'success' | 'danger';
  durationMs?: number;
  action?: ToastAction;
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);
  const viewName = useAppStore((state) => state.view.name);
  // 做菜页底部是主操作区，Toast 放到顶部，避免挡住“下一步 / 暂停”。
  const positionClass =
    viewName === 'cook'
      ? 'top-[calc(4.75rem+env(safe-area-inset-top))]'
      : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]';

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      clearTimer();

      const id = nextIdRef.current + 1;
      nextIdRef.current = id;
      setToast({ ...options, id });

      const duration = options.durationMs ?? (options.action ? 6000 : 2500);
      timerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        timerRef.current = null;
      }, duration);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const toneClass =
    toast?.tone === 'success'
      ? 'border-[var(--ok)]/50'
      : toast?.tone === 'danger'
        ? 'border-[var(--danger)]/50'
        : 'border-[var(--line)]';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast
        ? createPortal(
            <div
              className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${positionClass}`}
              role="status"
              aria-live="polite"
            >
              <div
                className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border bg-[var(--surface)] px-4 py-3 shadow-xl shadow-black/30 ${toneClass}`}
              >
                <p className="min-w-0 flex-1 text-sm leading-relaxed">{toast.message}</p>
                {toast.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      dismiss();
                      toast.action?.onClick();
                    }}
                    className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-[var(--accent-2)]"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return value;
}
