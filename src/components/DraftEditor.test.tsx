import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DraftSpec } from '@shared/schema';
import { DraftEditor } from './DraftEditor';

const spec: DraftSpec = {
  title: '番茄炒蛋',
  servings: 2,
  estimatedMinutes: 15,
  prep: [{ text: '番茄切块' }],
  steps: [
    { text: '倒油烧热', kind: 'timed', durationSec: 45 },
    { text: '炒至凝固', kind: 'judgment', suggestRange: [30, 60] },
  ],
  questions: [],
};

function lastSpec(onChange: ReturnType<typeof vi.fn>): DraftSpec {
  return onChange.mock.calls[0]?.[0] as DraftSpec;
}

describe('DraftEditor', () => {
  it('updates the title', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('菜谱名'), { target: { value: '新名字' } });

    expect(lastSpec(onChange).title).toBe('新名字');
  });

  it('clears the duration when switching a step to judgment', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '把第 1 步改为判断型' }));

    const step = lastSpec(onChange).steps[0];
    expect(step).toMatchObject({ kind: 'judgment', suggestRange: [30, 60] });
    expect(step).not.toHaveProperty('durationSec');
  });

  it('adds a default duration when switching a step to timed', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '把第 2 步改为定时型' }));

    const step = lastSpec(onChange).steps[1];
    expect(step).toMatchObject({ kind: 'timed', durationSec: 30 });
    expect(step).not.toHaveProperty('suggestRange');
  });

  it('appends a new step', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '加一步' }));

    expect(lastSpec(onChange).steps).toHaveLength(3);
  });

  it('does not allow deleting the last remaining step', () => {
    const onChange = vi.fn();
    render(
      <DraftEditor
        spec={{ ...spec, steps: [{ text: '唯一一步', kind: 'judgment' }] }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: '删除第 1 步' })).toBeDisabled();
  });
});
