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
    { text: '炒至凝固', kind: 'timed', durationSec: 60 },
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

  it('updates a step duration', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('第 1 步时长'), { target: { value: '90' } });

    const step = lastSpec(onChange).steps[0];
    expect(step).toMatchObject({ kind: 'timed', durationSec: 90 });
  });

  it('converts the input unit to seconds', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('第 1 步时长单位'), { target: { value: 'min' } });
    fireEvent.change(screen.getByLabelText('第 1 步时长'), { target: { value: '1.5' } });

    expect(lastSpec(onChange).steps[0]).toMatchObject({ kind: 'timed', durationSec: 90 });
  });

  it('no longer offers a judgment step type', () => {
    render(<DraftEditor spec={spec} onChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '把第 1 步改为判断型' })).toBeNull();
    expect(screen.queryByLabelText('第 1 步建议下限')).toBeNull();
  });

  it('adds a tag with the add button for touch keyboards', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('新标签'), { target: { value: '快手菜' } });
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }));

    expect(lastSpec(onChange).tags).toEqual(['快手菜']);
  });

  it('appends a timed step with a default duration', () => {
    const onChange = vi.fn();
    render(<DraftEditor spec={spec} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '加一步' }));

    const steps = lastSpec(onChange).steps;
    expect(steps).toHaveLength(3);
    expect(steps[2]).toMatchObject({ kind: 'timed', durationSec: 30 });
  });

  it('does not allow deleting the last remaining step', () => {
    const onChange = vi.fn();
    render(
      <DraftEditor
        spec={{ ...spec, steps: [{ text: '唯一一步', kind: 'timed', durationSec: 30 }] }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: '删除第 1 步' })).toBeDisabled();
  });
});
