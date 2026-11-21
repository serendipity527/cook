import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Recipe } from '@shared/schema';
import { RecipeRow } from './RecipeRow';

const recipe: Recipe = {
  schemaVersion: 1,
  id: 'r_1',
  title: '番茄炒蛋',
  servings: 2,
  tags: ['快手菜', '家常'],
  prep: [],
  steps: [{ id: 's1', text: '炒', kind: 'judgment', suggestRange: [30, 60] }],
  source: 'builtin',
  estimatedMinutes: 15,
  createdAt: 0,
  updatedAt: 0,
};

describe('RecipeRow', () => {
  it('restores duration, servings, and step count without source labels', () => {
    render(<RecipeRow recipe={recipe} onOpen={() => undefined} />);

    expect(screen.getByText('15 分钟 · 2 人份 · 1 步')).toBeInTheDocument();
    expect(screen.queryByText('内置')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /开火/ })).not.toBeInTheDocument();
  });

  it('shows a labelled fire button for cooked recipes', () => {
    const onFire = vi.fn();
    render(
      <RecipeRow
        recipe={recipe}
        lastCookedAt={Date.now() - 3 * 24 * 60 * 60 * 1000}
        onOpen={() => undefined}
        onFire={onFire}
      />,
    );

    expect(screen.getByText('3 天前')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开火做 番茄炒蛋' })).toBeInTheDocument();

    screen.getByRole('button', { name: '开火做 番茄炒蛋' }).click();
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('explains tag matches with #tags', () => {
    render(<RecipeRow recipe={recipe} matchedTags={['快手菜']} onOpen={() => undefined} />);

    expect(screen.getByText('#快手菜')).toBeInTheDocument();
  });

  it('opens a compact menu next to the more button', () => {
    const onEdit = vi.fn();
    render(
      <RecipeRow
        recipe={recipe}
        onOpen={() => undefined}
        actions={[
          { label: '编辑', onSelect: onEdit },
          { label: '删除', tone: 'danger', onSelect: () => undefined },
        ]}
      />,
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '更多操作 番茄炒蛋' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
