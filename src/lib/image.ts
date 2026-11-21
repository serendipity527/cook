/**
 * 把用户选的图片压成适合存本地的小图，失败时退回原文件。
 */
export async function compressImage(file: File, maxEdge = 1280, quality = 0.82): Promise<Blob> {
  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function' ||
    !file.type.startsWith('image/')
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      bitmap.close?.();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    return blob ?? file;
  } catch {
    return file;
  }
}
