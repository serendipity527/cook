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
