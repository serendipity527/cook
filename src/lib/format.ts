export function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));

  if (seconds < 60) {
    return `${seconds} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return rest === 0 ? `${minutes} 分钟` : `${minutes} 分 ${rest} 秒`;
}

export function formatRange(range: [number, number]): string {
  return `${formatSeconds(range[0])}–${formatSeconds(range[1])}`;
}

export function formatEstimatedMinutes(minutes?: number): string | null {
  return minutes ? `约 ${minutes} 分钟` : null;
}

/** “3 天”，用于“已经过了 3 天”这类句子。 */
export function formatAge(ageMs: number): string {
  if (ageMs < 60 * 60 * 1000) {
    return '不到 1 小时';
  }

  if (ageMs < 24 * 60 * 60 * 1000) {
    return `${Math.round(ageMs / (60 * 60 * 1000))} 小时`;
  }

  return `${Math.round(ageMs / (24 * 60 * 60 * 1000))} 天`;
}

/** “3 天前”，用于独立的时间标记。 */
export function formatAgeLabel(ageMs: number): string {
  if (ageMs < 60 * 60 * 1000) {
    return '刚刚';
  }

  return `${formatAge(ageMs)}前`;
}
