import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { DraftSpec, StepInput } from '@shared/schema';

interface DraftEditorProps {
  spec: DraftSpec;
  onChange: (spec: DraftSpec) => void;
}

export function DraftEditor({ spec, onChange }: DraftEditorProps) {
  const update = (patch: Partial<DraftSpec>) => onChange({ ...spec, ...patch });

  const updatePrep = (index: number, text: string) => {
    onChange({
      ...spec,
      prep: spec.prep.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)),
    });
  };

  const removePrep = (index: number) => {
    onChange({ ...spec, prep: spec.prep.filter((_, itemIndex) => itemIndex !== index) });
  };

  const updateStep = (index: number, step: StepInput) => {
    onChange({
      ...spec,
      steps: spec.steps.map((item, itemIndex) => (itemIndex === index ? step : item)),
    });
  };

  const removeStep = (index: number) => {
    if (spec.steps.length <= 1) {
      return;
    }

    onChange({ ...spec, steps: spec.steps.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;

    if (target < 0 || target >= spec.steps.length) {
      return;
    }

    const steps = [...spec.steps];
    const [step] = steps.splice(index, 1);

    if (!step) {
      return;
    }

    steps.splice(target, 0, step);
    onChange({ ...spec, steps });
  };

  const setKind = (index: number, kind: StepInput['kind']) => {
    const step = spec.steps[index];

    if (!step || step.kind === kind) {
      return;
    }

    if (kind === 'judgment') {
      updateStep(index, {
        text: step.text,
        speak: step.speak,
        kind: 'judgment',
        suggestRange: step.suggestRange ?? [30, 60],
        heat: step.heat,
        tip: step.tip,
        ingredients: step.ingredients,
        assetId: step.assetId,
      });
      return;
    }

    updateStep(index, {
      text: step.text,
      speak: step.speak,
      kind: 'timed',
      durationSec: step.durationSec ?? 30,
      heat: step.heat,
      tip: step.tip,
      ingredients: step.ingredients,
      assetId: step.assetId,
    });
  };

  const updateRange = (index: number, position: 0 | 1, value: number) => {
    const step = spec.steps[index];

    if (!step) {
      return;
    }

    const current: [number, number] = step.suggestRange ?? [30, 60];
    const range: [number, number] = position === 0 ? [value, current[1]] : [current[0], value];
    updateStep(index, { ...step, suggestRange: range });
  };

  return (
    <section className="mt-6 rounded-3xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-[var(--muted)]">编辑草稿</h2>
        <span className="text-[11px] text-[var(--muted)]">保存前都可以改</span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">菜谱名</span>
          <input
            aria-label="菜谱名"
            value={spec.title}
            onChange={(event) => update({ title: event.target.value })}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2.5 text-base outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">份量（人）</span>
            <input
              aria-label="份量"
              type="number"
              min={1}
              max={20}
              value={spec.servings}
              onChange={(event) => update({ servings: Number(event.target.value) })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2.5 text-base outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">预计分钟</span>
            <input
              aria-label="预计分钟"
              type="number"
              min={1}
              value={spec.estimatedMinutes ?? ''}
              onChange={(event) =>
                update({
                  estimatedMinutes:
                    event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2.5 text-base outline-none"
            />
          </label>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-medium text-[var(--muted)]">备菜</h3>
        <div className="mt-2 space-y-2">
          {spec.prep.map((item, index) => (
            <div key={`prep-${index}`} className="flex items-center gap-2">
              <input
                aria-label={`备菜 ${index + 1}`}
                value={item.text}
                onChange={(event) => updatePrep(index, event.target.value)}
                className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                aria-label={`删除备菜 ${index + 1}`}
                onClick={() => removePrep(index)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update({ prep: [...spec.prep, { text: '新备菜' }] })}
          className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-2)]"
        >
          <Plus size={14} />
          加一项备菜
        </button>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-medium text-[var(--muted)]">步骤</h3>
        <div className="mt-2 space-y-3">
          {spec.steps.map((step, index) => (
            <div key={`step-${index}`} className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--muted)]">第 {index + 1} 步</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`上移第 ${index + 1} 步`}
                    disabled={index === 0}
                    onClick={() => moveStep(index, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] disabled:opacity-30"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移第 ${index + 1} 步`}
                    disabled={index === spec.steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] disabled:opacity-30"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除第 ${index + 1} 步`}
                    disabled={spec.steps.length <= 1}
                    onClick={() => removeStep(index)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <textarea
                aria-label={`第 ${index + 1} 步文案`}
                rows={2}
                value={step.text}
                onChange={(event) => updateStep(index, { ...step, text: event.target.value })}
                className="mt-2 w-full resize-none rounded-xl bg-black/20 px-3 py-2 text-sm leading-relaxed outline-none"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={`把第 ${index + 1} 步改为定时型`}
                  aria-pressed={step.kind === 'timed'}
                  onClick={() => setKind(index, 'timed')}
                  className={
                    step.kind === 'timed'
                      ? 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#201008]'
                      : 'rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[var(--muted)]'
                  }
                >
                  定时
                </button>
                <button
                  type="button"
                  aria-label={`把第 ${index + 1} 步改为判断型`}
                  aria-pressed={step.kind === 'judgment'}
                  onClick={() => setKind(index, 'judgment')}
                  className={
                    step.kind === 'judgment'
                      ? 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[#201008]'
                      : 'rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[var(--muted)]'
                  }
                >
                  判断
                </button>

                {step.kind === 'timed' ? (
                  <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    秒数
                    <input
                      aria-label={`第 ${index + 1} 步秒数`}
                      type="number"
                      min={3}
                      max={3600}
                      value={step.durationSec ?? ''}
                      onChange={(event) =>
                        updateStep(index, {
                          ...step,
                          durationSec:
                            event.target.value === ''
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                      className="w-20 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-[var(--text)] outline-none"
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    建议
                    <input
                      aria-label={`第 ${index + 1} 步建议下限`}
                      type="number"
                      min={1}
                      value={step.suggestRange?.[0] ?? 30}
                      onChange={(event) => updateRange(index, 0, Number(event.target.value))}
                      className="w-16 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-[var(--text)] outline-none"
                    />
                    –
                    <input
                      aria-label={`第 ${index + 1} 步建议上限`}
                      type="number"
                      min={1}
                      value={step.suggestRange?.[1] ?? 60}
                      onChange={(event) => updateRange(index, 1, Number(event.target.value))}
                      className="w-16 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-[var(--text)] outline-none"
                    />
                    秒
                  </div>
                )}
              </div>

              <input
                aria-label={`第 ${index + 1} 步播报文案`}
                value={step.speak ?? ''}
                placeholder="语音播报文案（可留空）"
                onChange={(event) =>
                  updateStep(index, {
                    ...step,
                    speak: event.target.value === '' ? undefined : event.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-black/20 px-3 py-2 text-xs outline-none placeholder:text-[var(--muted)]"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update({ steps: [...spec.steps, { text: '新步骤', kind: 'judgment' }] })}
          className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-2)]"
        >
          <Plus size={14} />
          加一步
        </button>
      </div>
    </section>
  );
}
