import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { deleteAsset, savePhotoAsset } from '@/data/repo';
import { compressImage } from '@/lib/image';
import { useAssetUrl } from '@/lib/useAssetUrl';

interface PhotoFieldProps {
  recipeId: string;
  assetId?: string;
  src?: string;
  label: string;
  onChange: (assetId: string | undefined) => void;
}

/** 编辑器里给备菜 / 步骤加一张图。 */
export function PhotoField({ recipeId, assetId, src, label, onChange }: PhotoFieldProps) {
  const url = useAssetUrl(assetId);
  const preview = url ?? src ?? null;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }

    setBusy(true);

    try {
      const blob = await compressImage(file);
      const asset = await savePhotoAsset({ recipeId, blob });
      onChange(asset.id);
    } catch (error) {
      console.error('[kaihuo] failed to save the photo', error);
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const remove = () => {
    if (assetId) {
      void deleteAsset(assetId).catch(() => undefined);
    }

    onChange(undefined);
  };

  return (
    <div className="relative shrink-0">
      {preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={`更换${label}`}
          className="block h-10 w-10 overflow-hidden rounded-xl ring-1 ring-[var(--line)] disabled:opacity-60"
        >
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={`添加${label}`}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--tint-strong)] px-3 text-xs text-[var(--muted)] transition active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ImagePlus size={15} />
          )}
          <span>图片</span>
        </button>
      )}

      {assetId ? (
        <button
          type="button"
          onClick={remove}
          aria-label={`删除${label}`}
          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg rounded-tr-xl bg-black/60 text-white"
        >
          <X size={11} />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
