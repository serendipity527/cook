import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmSheet } from './ConfirmSheet';
import { ToastProvider, useToast } from './ToastProvider';

afterEach(() => {
  vi.useRealTimers();
});

function ToastHarness({ onUndo }: { onUndo: () => void }) {
  const { showToast } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        showToast({
          message: '已删除「番茄炒蛋」',
          action: { label: '撤销', onClick: onUndo },
        })
      }
    >
      显示提示
    </button>
  );
}

describe('ToastProvider', () => {
  it('shows an action toast and runs the action', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();

    render(
      <ToastProvider>
        <ToastHarness onUndo={onUndo} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示提示' }));

    expect(screen.getByText('已删除「番茄炒蛋」')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '撤销' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('已删除「番茄炒蛋」')).not.toBeInTheDocument();
  });

  it('dismisses an action toast after six seconds', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastHarness onUndo={() => undefined} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示提示' }));

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(screen.getByText('已删除「番茄炒蛋」')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('已删除「番茄炒蛋」')).not.toBeInTheDocument();
  });
});

describe('ConfirmSheet', () => {
  it('closes on Escape and keeps focus inside the dialog', () => {
    const onCancel = vi.fn();

    render(
      <ConfirmSheet
        open
        title="要结束这次做菜吗？"
        description="已完成的步骤会保存。"
        cancelLabel="继续做"
        confirmLabel="结束并保存"
        onCancel={onCancel}
        onConfirm={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('要结束这次做菜吗？');
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', () => {
    const onCancel = vi.fn();

    render(
      <ConfirmSheet
        open
        title="删除这道菜？"
        cancelLabel="取消"
        confirmLabel="删除"
        onCancel={onCancel}
        onConfirm={() => undefined}
      />,
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
