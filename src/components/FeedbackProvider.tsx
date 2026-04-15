import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../utils/cn';

type FeedbackTone = 'info' | 'success' | 'warning' | 'danger';

type ToastOptions = {
  title?: string;
  message: string;
  details?: string[];
  tone?: FeedbackTone;
  durationMs?: number;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  details?: string[];
  tone?: FeedbackTone;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
};

type ToastItem = ToastOptions & {
  id: string;
  tone: FeedbackTone;
  durationMs: number;
};

type DialogRequest = ConfirmOptions & {
  id: string;
  resolve: (value: boolean) => void;
};

type FeedbackContextValue = {
  notify: (options: ToastOptions | string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const DEFAULT_DURATIONS: Record<FeedbackTone, number> = {
  info: 3600,
  success: 3200,
  warning: 4600,
  danger: 5600,
};

const toneIconMap: Record<FeedbackTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertTriangle,
};

const toneAccentMap: Record<FeedbackTone, string> = {
  info: 'text-hr-primary',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-red-500',
};

const toneBorderMap: Record<FeedbackTone, string> = {
  info: 'border-hr-primary/18',
  success: 'border-emerald-500/18',
  warning: 'border-amber-500/20',
  danger: 'border-red-500/18',
};

const toneSurfaceMap: Record<FeedbackTone, string> = {
  info: 'bg-hr-primary/8',
  success: 'bg-emerald-500/8',
  warning: 'bg-amber-500/10',
  danger: 'bg-red-500/8',
};

const normalizeToastOptions = (options: ToastOptions | string): ToastItem => {
  const value = typeof options === 'string' ? { message: options } : options;
  const tone = value.tone ?? 'info';

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: value.title,
    message: value.message,
    details: value.details?.filter((detail) => detail.trim().length > 0),
    tone,
    durationMs: value.durationMs ?? DEFAULT_DURATIONS[tone],
  };
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeDialog, setActiveDialog] = useState<DialogRequest | null>(null);
  const dialogQueueRef = useRef<DialogRequest[]>([]);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const activeDialogRef = useRef<DialogRequest | null>(null);

  const removeToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
    const timer = toastTimersRef.current.get(toastId);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(toastId);
    }
  }, []);

  const notify = useCallback((options: ToastOptions | string) => {
    const nextToast = normalizeToastOptions(options);
    setToasts((current) => [...current, nextToast]);

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== nextToast.id));
      toastTimersRef.current.delete(nextToast.id);
    }, nextToast.durationMs);

    toastTimersRef.current.set(nextToast.id, timer);
  }, []);

  const flushNextDialog = useCallback(() => {
    const nextDialog = dialogQueueRef.current.shift() ?? null;
    setActiveDialog(nextDialog);
  }, []);

  const settleDialog = useCallback((value: boolean) => {
    setActiveDialog((current) => {
      if (!current) return current;
      current.resolve(value);
      return null;
    });
    window.setTimeout(() => {
      flushNextDialog();
    }, 0);
  }, [flushNextDialog]);

  const confirm = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => {
      const request: DialogRequest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        resolve,
        tone: options.tone ?? 'warning',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        confirmVariant: options.confirmVariant ?? 'primary',
        ...options,
      };

      if (!activeDialog) {
        setActiveDialog(request);
        return;
      }

      dialogQueueRef.current.push(request);
    })
  ), [activeDialog]);

  useEffect(() => {
    activeDialogRef.current = activeDialog;
  }, [activeDialog]);

  useEffect(() => () => {
    for (const timer of toastTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    toastTimersRef.current.clear();
    if (activeDialogRef.current) {
      activeDialogRef.current.resolve(false);
    }
    for (const pending of dialogQueueRef.current) {
      pending.resolve(false);
    }
    dialogQueueRef.current = [];
  }, []);

  useEffect(() => {
    if (!activeDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        settleDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog, settleDialog]);

  const value = useMemo<FeedbackContextValue>(() => ({
    notify,
    confirm,
  }), [confirm, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-end px-4 pb-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const Icon = toneIconMap[toast.tone];
            return (
              <div
                key={toast.id}
                className={cn(
                  'pointer-events-auto rounded-2xl border bg-hr-panel/88 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl',
                  toneBorderMap[toast.tone],
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10',
                      toneSurfaceMap[toast.tone],
                    )}
                  >
                    <Icon size={14} className={toneAccentMap[toast.tone]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {toast.title ? (
                      <div className="text-sm font-semibold text-hr-text">{toast.title}</div>
                    ) : null}
                    <div className={cn('text-sm leading-5 text-hr-muted', toast.title && 'mt-0.5')}>
                      {toast.message}
                    </div>
                    {toast.details?.length ? (
                      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[12px] leading-5 text-hr-muted">
                        {toast.details.map((detail, index) => (
                          <li key={`${toast.id}-${index}`}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-hr-muted transition-colors hover:border-hr-border hover:text-hr-text"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeDialog ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/28 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              settleDialog(false);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-hr-border bg-hr-panel/96 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10',
                  toneSurfaceMap[activeDialog.tone],
                )}
              >
                {(() => {
                  const Icon = toneIconMap[activeDialog.tone];
                  return <Icon size={16} className={toneAccentMap[activeDialog.tone]} />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-hr-text">{activeDialog.title}</div>
                {activeDialog.message ? (
                  <div className="mt-1 text-sm leading-5 text-hr-muted">{activeDialog.message}</div>
                ) : null}
                {activeDialog.details?.length ? (
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[12px] leading-5 text-hr-muted">
                    {activeDialog.details.map((detail, index) => (
                      <li key={`${activeDialog.id}-${index}`}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => settleDialog(false)}
                className="rounded-xl border border-hr-border px-3 py-1.5 text-sm text-hr-muted transition-colors hover:text-hr-text"
              >
                {activeDialog.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => settleDialog(true)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-medium text-white transition-colors',
                  activeDialog.confirmVariant === 'danger'
                    ? 'bg-red-500 hover:bg-red-500/90'
                    : 'bg-hr-primary hover:bg-hr-primary/90',
                )}
              >
                {activeDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider.');
  }
  return context;
};
