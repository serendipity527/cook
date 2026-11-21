import { useEffect, useState } from 'react';
import { getAsset } from '@/data/repo';

/** 把 assets 表里的图片变成可以直接给 <img> 用的 object URL。 */
export function useAssetUrl(assetId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void getAsset(assetId)
      .then((asset) => {
        if (!asset || cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assetId]);

  return url;
}
