import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

const ICONS = { info: Info, success: CheckCircle2, error: TriangleAlert } as const;

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon size={16} aria-hidden />
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button type="button" className="toast-action" onClick={() => { t.action?.run(); dismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
            <button type="button" className="icon-btn toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
