export function aiErrorMessage(error: Error): string {
  const raw = error.message.trim();

  if (!raw) {
    return '生成失败，请稍后重试';
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
    ) {
      return (parsed as { error: string }).error;
    }
  } catch {
    // 不是 JSON，按普通错误信息展示
  }

  return raw;
}
