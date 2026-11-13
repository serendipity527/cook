import { isTimedStep, type Recipe, type StepLog } from '@shared/schema';

export interface DurationSuggestion {
  stepId: string;
  plannedSec: number;
  actualSec: number;
  nextSec: number;
}

export function suggestDurations(recipe: Recipe, logs: StepLog[]): DurationSuggestion[] {
  const logByStep = new Map(logs.map((log) => [log.stepId, log]));
  const suggestions: DurationSuggestion[] = [];

  for (const step of recipe.steps) {
    if (!isTimedStep(step)) {
      continue;
    }

    const log = logByStep.get(step.id);
    if (!log || log.skipped) {
      continue;
    }

    const planned = step.durationSec;
    const actual = Math.round(log.actualSec);

    // 走了很久才回来点确认，不代表这一步真的需要这么久
    if (actual > planned * 3) {
      continue;
    }

    const delta = actual - planned;
    if (delta < 10 && delta < planned * 0.25) {
      continue;
    }

    const nextSec = Math.min(3600, Math.max(3, Math.round(actual / 5) * 5));
    if (nextSec === planned) {
      continue;
    }

    suggestions.push({ stepId: step.id, plannedSec: planned, actualSec: actual, nextSec });
  }

  return suggestions;
}

export function applyDurationSuggestions(
  recipe: Recipe,
  suggestions: DurationSuggestion[],
  now = Date.now(),
): Recipe {
  if (suggestions.length === 0) {
    return recipe;
  }

  const nextById = new Map(suggestions.map((suggestion) => [suggestion.stepId, suggestion.nextSec]));

  return {
    ...recipe,
    steps: recipe.steps.map((step) => {
      const next = nextById.get(step.id);

      if (next === undefined || !isTimedStep(step)) {
        return step;
      }

      return { ...step, durationSec: next };
    }),
    updatedAt: now,
  };
}
