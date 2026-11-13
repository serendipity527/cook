import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useAppStore } from '@/store/useAppStore';

type BackGuard = () => boolean;

interface NavigationContextValue {
  requestBack: () => void;
  registerGuard: (guard: BackGuard) => () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const guardsRef = useRef<BackGuard[]>([]);

  const registerGuard = useCallback((guard: BackGuard) => {
    guardsRef.current.push(guard);

    return () => {
      guardsRef.current = guardsRef.current.filter((item) => item !== guard);
    };
  }, []);

  const handleBack = useCallback(() => {
    const guard = guardsRef.current[guardsRef.current.length - 1];

    if (guard?.()) {
      return true;
    }

    return useAppStore.getState().back();
  }, []);

  const requestBack = useCallback(() => {
    handleBack();
  }, [handleBack]);

  useEffect(() => {
    window.history.pushState({ kaihuo: true }, '');

    const handlePopState = () => {
      if (handleBack()) {
        window.history.pushState({ kaihuo: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBack]);

  return (
    <NavigationContext.Provider value={{ requestBack, registerGuard }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const value = useContext(NavigationContext);

  if (!value) {
    throw new Error('useNavigation must be used inside NavigationProvider');
  }

  return value;
}

export function useRequestBack(): () => void {
  return useNavigation().requestBack;
}

export function useBackGuard(guard: BackGuard): void {
  const { registerGuard } = useNavigation();
  const guardRef = useRef(guard);

  useEffect(() => {
    guardRef.current = guard;
  }, [guard]);

  useEffect(() => {
    const stableGuard = () => guardRef.current();

    return registerGuard(stableGuard);
  }, [registerGuard]);
}
