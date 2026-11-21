import type { DraftSpec, StepInput } from '@shared/schema';

const DEFAULT_DURATION_SEC = 30;
const MIN_DURATION_SEC = 3;
const MAX_DURATION_SEC = 3600;

function clampDuration(value: number) {
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, Math.round(value)));
}

/**
 * 编辑器只支持定时步骤：把旧的判断型步骤按建议时长的中位数转成定时步骤。
 */
export function toTimedStep(step: StepInput): StepInput {
  if (step.kind === 'timed' && step.durationSec !== undefined) {
    return step;
  }

  const suggested = step.suggestRange
    ? (step.suggestRange[0] + step.suggestRange[1]) / 2
    : (step.durationSec ?? DEFAULT_DURATION_SEC);

  const next: StepInput = {
    ...step,
    kind: 'timed',
    durationSec: clampDuration(suggested),
  };

  delete next.suggestRange;

  return next;
}

export function toTimedDraft(spec: DraftSpec): DraftSpec {
  if (spec.steps.every((step) => step.kind === 'timed' && step.durationSec !== undefined)) {
    return spec;
  }

  return { ...spec, steps: spec.steps.map(toTimedStep) };
}
