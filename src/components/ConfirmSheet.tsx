import type { ReactNode } from 'react';
import { BigButton } from './BigButton';
import { BottomSheet } from './BottomSheet';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss?: () => void;
}

export function ConfirmSheet({
  open,
  title,
  description,
  cancelLabel = '取消',
  confirmLabel,
  tone = 'default',
  onCancel,
  onConfirm,
  onDismiss,
}: ConfirmSheetProps) {
  return (
    <BottomSheet open={open} title={title} onClose={onDismiss ?? onCancel}>
      {description ? (
        <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      ) : null}
      <div className="mt-6 space-y-3">
        <BigButton onClick={onCancel}>{cancelLabel}</BigButton>
        <BigButton variant={tone === 'danger' ? 'danger' : 'secondary'} onClick={onConfirm}>
          {confirmLabel}
        </BigButton>
      </div>
    </BottomSheet>
  );
}
