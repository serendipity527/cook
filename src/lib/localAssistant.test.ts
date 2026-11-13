import { describe, expect, it } from 'vitest';
import { builtinRecipes } from '@/data/builtin';
import { localAssistantReply } from './localAssistant';

const recipes = builtinRecipes.slice(0, 2);

describe('localAssistantReply', () => {
  it('answers a pure greeting without creating a recipe', () => {
    const reply = localAssistantReply({
      message: '你好！',
      recipes,
      hasDraft: false,
    });

    expect(reply?.reply).toContain('你好');
    expect(reply?.recipeIds).toBeUndefined();
  });

  it('keeps an existing draft when greeting', () => {
    const reply = localAssistantReply({
      message: '你好',
      recipes,
      hasDraft: true,
      draftTitle: '番茄炒蛋',
    });

    expect(reply?.reply).toContain('番茄炒蛋');
  });

  it('does not short-circuit a greeting plus a recipe request', () => {
    expect(
      localAssistantReply({
        message: '你好，帮我录一道番茄炒蛋',
        recipes,
        hasDraft: false,
      }),
    ).toBeNull();
  });

  it('lists all recipes', () => {
    const reply = localAssistantReply({
      message: '我有哪些菜谱？',
      recipes,
      hasDraft: false,
    });

    expect(reply?.recipeIds).toEqual(recipes.map((recipe) => recipe.id));
    expect(reply?.reply).toContain(recipes[0]!.title);
  });

  it('shows a recipe by title', () => {
    const reply = localAssistantReply({
      message: `查看${recipes[0]!.title}`,
      recipes,
      hasDraft: false,
    });

    expect(reply?.recipeIds).toEqual([recipes[0]!.id]);
  });

  it('asks a follow-up for ambiguous titles', () => {
    const duplicated = [...recipes, { ...recipes[0]!, id: 'copy' }];
    const reply = localAssistantReply({
      message: `查看${recipes[0]!.title}`,
      recipes: duplicated,
      hasDraft: false,
    });

    expect(reply?.recipeIds).toHaveLength(2);
  });

  it('suggests a random recipe for “今天吃什么”', () => {
    const reply = localAssistantReply({
      message: '今天吃什么好？',
      recipes,
      hasDraft: false,
    });

    expect(reply?.recipeIds).toHaveLength(1);
    expect(recipes.some((recipe) => recipe.id === reply?.recipeIds?.[0])).toBe(true);
  });

  it('does not discard a draft when asked to create a new one', () => {
    const reply = localAssistantReply({
      message: '新建菜谱',
      recipes,
      hasDraft: true,
      draftTitle: '番茄炒蛋',
    });

    expect(reply?.reply).toContain('保存');
  });

  it('returns null for ordinary conversation', () => {
    expect(
      localAssistantReply({ message: '今天天气不错', recipes, hasDraft: false }),
    ).toBeNull();
  });
});
