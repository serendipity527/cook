import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import type { DraftSpec, StepInput } from '@shared/schema';
import { DurationField } from './DurationField';
import { PhotoField } from './PhotoField';

interface DraftEditorProps {
  spec: DraftSpec;
  onChange: (spec: DraftSpec) => void;
  heading?: string;
  recipeId?: string;
}

export function DraftEditor({ spec, onChange, heading = '编辑草稿', recipeId }: DraftEditorProps) {
  const tags = spec.tags ?? [];
  const [tagInput, setTagInput] = useState('');
  const update = (patch: Partial<DraftSpec>) => onChange({ ...spec, ...patch });

  const addTag = () => {
    const tag = tagInput.trim().slice(0, 12);

    if (!tag || tags.includes(tag) || tags.length >= 10) {
      setTagInput('');
      return;
    }

    update({ tags: [...tags, tag] });
    setTagInput('');
  };

  const removeTag = (target: string) => {
    update({ tags: tags.filter((tag) => tag !== target) });
  };

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

  return (
    <section className="mt-6 rounded-3xl bg-[var(--surface)] p-5">
      <h2 className="text-sm font-medium text-[var(--muted)]">{heading}</h2>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">菜谱名</span>
          <input
            aria-label="菜谱名"
            value={spec.title}
            placeholder="比如：番茄炒蛋"
            onChange={(event) => update({ title: event.target.value })}
            className="mt-1 w-full rounded-xl bg-[var(--tint)] px-3 py-2.5 text-base outline-none placeholder:text-[var(--muted)]"
          />
        </label>

        <div className="block">
          <span className="text-xs text-[var(--muted)]">标签（最多 10 个）</span>
          <div className="mt-1 rounded-xl bg-[var(--tint)] p-2">
            {tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs text-[var(--accent-2)]"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`删除标签 ${tag}`}
                      onClick={() => removeTag(tag)}
                      className="flex h-5 w-5 items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-1 flex items-center gap-2">
              <input
                aria-label="新标签"
                value={tagInput}
                maxLength={12}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder={tags.length === 0 ? '如：快手菜、下饭' : '再加一个…'}
                className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-[var(--muted)]"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={tagInput.trim() === '' || tags.length >= 10}
                aria-label="添加标签"
                className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-[var(--tint-strong)] px-3 text-xs font-medium text-[var(--accent-2)] disabled:opacity-40"
              >
                <Plus size={14} />
                添加
              </button>
            </div>
          </div>
        </div>

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
              className="mt-1 w-full rounded-xl bg-[var(--tint)] px-3 py-2.5 text-base outline-none"
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
              className="mt-1 w-full rounded-xl bg-[var(--tint)] px-3 py-2.5 text-base outline-none"
            />
          </label>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-medium text-[var(--muted)]">备菜</h3>
        <div className="mt-2 space-y-2">
          {spec.prep.map((item, index) => (
            <div key={`prep-${index}`} className="rounded-xl bg-[var(--tint)] p-2">
              <div className="flex items-center gap-1.5">
                <input
                  aria-label={`备菜 ${index + 1}`}
                  value={item.text}
                  onChange={(event) => updatePrep(index, event.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
                />
                {recipeId ? (
                  <PhotoField
                    recipeId={recipeId}
                    assetId={item.photoAssetId}
                    src={item.photoSrc}
                    label={`备菜 ${index + 1} 图片`}
                    onChange={(assetId) =>
                      onChange({
                        ...spec,
                        prep: spec.prep.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, photoAssetId: assetId } : entry,
                        ),
                      })
                    }
                  />
                ) : null}
                <button
                  type="button"
                  aria-label={`删除备菜 ${index + 1}`}
                  onClick={() => removePrep(index)}
                  className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
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
            <div key={`step-${index}`} className="rounded-2xl bg-[var(--tint)] p-3">
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
                className="mt-2 w-full resize-none rounded-xl bg-[var(--inset)] px-3 py-2 text-sm leading-relaxed outline-none"
              />

              <textarea
                aria-label={`第 ${index + 1} 步补充说明`}
                rows={2}
                value={step.detail ?? ''}
                placeholder="补充说明：具体怎么做（可留空）"
                onChange={(event) =>
                  updateStep(index, {
                    ...step,
                    detail: event.target.value === '' ? undefined : event.target.value,
                  })
                }
                className="mt-2 w-full resize-none rounded-xl bg-[var(--inset)] px-3 py-2 text-xs leading-relaxed outline-none placeholder:text-[var(--muted)]"
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <DurationField
                  seconds={step.durationSec}
                  label={`第 ${index + 1} 步时长`}
                  onChange={(seconds) =>
                    updateStep(index, { ...step, kind: 'timed', durationSec: seconds })
                  }
                />

                {recipeId ? (
                  <PhotoField
                    recipeId={recipeId}
                    assetId={step.photoAssetId}
                    src={step.photoSrc}
                    label={`第 ${index + 1} 步图片`}
                    onChange={(assetId) =>
                      updateStep(index, { ...step, photoAssetId: assetId })
                    }
                  />
                ) : null}
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
                className="mt-2 w-full rounded-xl bg-[var(--inset)] px-3 py-2 text-xs outline-none placeholder:text-[var(--muted)]"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            update({ steps: [...spec.steps, { text: '新步骤', kind: 'timed', durationSec: 30 }] })
          }
          className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-2)]"
        >
          <Plus size={14} />
          加一步
        </button>
      </div>
    </section>
  );
}
