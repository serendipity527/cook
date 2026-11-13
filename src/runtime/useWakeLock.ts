import { useCallback, useEffect, useRef } from 'react';

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      sentinelRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // 电量低等情况下浏览器会拒绝，静默降级
    }
  }, [active]);

  useEffect(() => {
    if (active) {
      void acquire();
    }

    return () => {
      void sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, [active, acquire]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [acquire]);
}
