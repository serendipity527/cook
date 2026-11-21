import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { BigButton } from './BigButton';
import { BottomSheet } from './BottomSheet';

export interface ActionSheetAction {
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface ActionSheetProps {
  open: boolean;
  title: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

export function ActionSheet({ open, title, actions, onClose }: ActionSheetProps) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className="mt-2 space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              onClose();
              action.onSelect();
            }}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-[var(--tint)] p-4 text-left transition active:scale-[0.995]"
          >
            {action.icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent-2)]">
                {action.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span
                className={
                  action.tone === 'danger'
                    ? 'block text-[15px] font-medium text-[var(--danger)]'
                    : 'block text-[15px] font-medium'
                }
              >
                {action.label}
              </span>
              {action.description ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">
                  {action.description}
                </span>
              ) : null}
            </span>
            <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
          </button>
        ))}
      </div>
      <BigButton variant="secondary" size="compact" className="mt-3" onClick={onClose}>
        取消
      </BigButton>
    </BottomSheet>
  );
}
