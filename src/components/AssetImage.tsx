import { useAssetUrl } from '@/lib/useAssetUrl';

interface AssetImageProps {
  assetId?: string;
  src?: string;
  alt: string;
  className?: string;
}

/** 优先读 IndexedDB 里的用户图片，其次用内置菜谱自带的静态图片。 */
export function AssetImage({ assetId, src, alt, className }: AssetImageProps) {
  const url = useAssetUrl(assetId);
  const finalSrc = url ?? src;

  if (!finalSrc) {
    return null;
  }

  return <img src={finalSrc} alt={alt} className={className} loading="lazy" />;
}
