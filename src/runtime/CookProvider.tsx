import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Recipe } from '@shared/schema';
import { getRecipe, newId, saveSession } from '@/data/repo';
import { useAppStore } from '@/store/useAppStore';
import { audio, vibrate } from './audio';
import {
  cookReducer,
  createInitialState,
  prepareCookState,
  reconcileAfterRestore,
  toSession,
  type CookEvent,
  type CookState,
} from './machine';
import { clearSnapshot, peekSnapshot, saveSnapshot, type SnapshotPeek } from './snapshot';
import { useWakeLock } from './useWakeLock';

type RootAction =
  | { type: 'event'; event: CookEvent }
  | { type: 'replace'; state: CookState | null }
  | { type: 'prepare'; recipe: Recipe; now: number }
  | { type: 'begin'; recipe: Recipe; now: number }
  | { type: 'start'; now: number };

function rootReducer(state: CookState | null, action: RootAction): CookState | null {
  if (action.type === 'replace') {
    return action.state;
  }

  if (action.type === 'prepare') {
    return prepareCookState(state, action.recipe, newId('sess'), action.now);
  }

  if (action.type === 'begin') {
    const initial = createInitialState(action.recipe, newId('sess'), action.now);
    return cookReducer(initial, { type: 'START_COOKING', now: action.now });
  }

  if (action.type === 'start') {
    if (!state) {
      return state;
    }

    return cookReducer(state, { type: 'START_COOKING', now: action.now });
  }

  if (!state) {
    return state;
  }

  return cookReducer(state, action.event);
}

export interface ResumeInfo {
  recipeId: string;
  title: string;
  stepIndex: number;
  totalSteps: number;
  savedAt: number;
  ageMs: number;
  fresh: boolean;
}

interface CookContextValue {
  state: CookState | null;
  resumeInfo: ResumeInfo | null;
  prepare: (recipe: Recipe) => void;
  begin: (recipe: Recipe) => void;
  startCooking: () => void;
  resume: () => boolean;
  discardResume: () => void;
  reset: () => void;
  dispatch: (event: CookEvent) => void;
}

const CookContext = createContext<CookContextValue | null>(null);

function toResumeInfo(snapshot: SnapshotPeek): ResumeInfo {
  return {
    recipeId: snapshot.state.recipe.id,
    title: snapshot.state.recipe.title,
    stepIndex: snapshot.state.stepIndex,
    totalSteps: snapshot.state.recipe.steps.length,
    savedAt: snapshot.savedAt,
    ageMs: snapshot.ageMs,
    fresh: snapshot.fresh,
  };
}

export function CookProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(rootReducer, null);
  const initialSnapshotRef = useRef<SnapshotPeek | null | undefined>(undefined);

  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = peekSnapshot();
  }

  const initialSnapshot = initialSnapshotRef.current;
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(() =>
    initialSnapshot?.state.phase === 'cooking' ? toResumeInfo(initialSnapshot) : null,
  );
  const [booting, setBooting] = useState(() =>
    Boolean(initialSnapshot?.fresh && initialSnapshot.state.phase === 'cooking'),
  );
  const speechEnabled = useAppStore((selector) => selector.speechEnabled);
  const speechRate = useAppStore((selector) => selector.speechRate);
  const savedSessionRef = useRef<string | null>(null);
  const skipFirstSpeechRef = useRef(false);
  const previousStateRef = useRef<CookState | null>(null);
  const autoResumeRef = useRef(false);

  const dispatch = useCallback((event: CookEvent) => {
    rawDispatch({ type: 'event', event });
  }, []);

  const prepare = useCallback((recipe: Recipe) => {
    rawDispatch({ type: 'prepare', recipe, now: Date.now() });
  }, []);

  const begin = useCallback((recipe: Recipe) => {
    void audio.unlock();
    skipFirstSpeechRef.current = false;
    savedSessionRef.current = null;
    setResumeInfo(null);
    clearSnapshot();
    rawDispatch({ type: 'begin', recipe, now: Date.now() });
  }, []);

  const startCooking = useCallback(() => {
    void audio.unlock();
    skipFirstSpeechRef.current = false;
    savedSessionRef.current = null;
    setResumeInfo(null);
    clearSnapshot();
    rawDispatch({ type: 'start', now: Date.now() });
  }, []);

  const resume = useCallback(() => {
    const snapshot = peekSnapshot();

    if (!snapshot || snapshot.state.phase !== 'cooking') {
      setResumeInfo(null);
      return false;
    }

    const restored = reconcileAfterRestore(snapshot.state, Date.now());
    skipFirstSpeechRef.current = true;
    savedSessionRef.current = null;
    setResumeInfo(null);
    rawDispatch({ type: 'replace', state: restored });
    return true;
  }, []);

  const discardResume = useCallback(() => {
    clearSnapshot();
    setResumeInfo(null);
  }, []);

  const reset = useCallback(() => {
    audio.stopSpeak();
    clearSnapshot();
    savedSessionRef.current = null;
    setResumeInfo(null);
    rawDispatch({ type: 'replace', state: null });
  }, []);

  useEffect(() => {
    if (autoResumeRef.current) {
      return;
    }

    autoResumeRef.current = true;
    const snapshot = peekSnapshot();

    if (!snapshot?.fresh || snapshot.state.phase !== 'cooking') {
      setBooting(false);
      return;
    }

    void getRecipe(snapshot.state.recipe.id)
      .then((recipe) => {
        if (!recipe) {
          setBooting(false);
          return;
        }

        const restored = reconcileAfterRestore(snapshot.state, Date.now());
        skipFirstSpeechRef.current = true;
        savedSessionRef.current = null;
        setResumeInfo(null);
        rawDispatch({ type: 'replace', state: restored });
        useAppStore.getState().resetTo([{ name: 'home' }, { name: 'cook' }]);
        setBooting(false);
      })
      .catch(() => {
        setBooting(false);
      });
  }, []);

  useWakeLock(state?.phase === 'cooking');

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.phase === 'cooking') {
      saveSnapshot(state);
    } else if (state.phase === 'done') {
      clearSnapshot();
    }
  }, [state]);

  useEffect(() => {
    if (!state || state.phase !== 'done' || savedSessionRef.current === state.sessionId) {
      return;
    }

    savedSessionRef.current = state.sessionId;
    const session = toSession(state, Date.now());

    void saveSession(session)
      .catch((error: unknown) => {
        console.error('[kaihuo] failed to save cook session', error);
      })
      .finally(() => clearSnapshot());
  }, [state]);

  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;

    if (!state) {
      return;
    }

    if (previous?.phase === 'cooking' && state.phase === 'done') {
      vibrate([100, 80, 100, 80, 200]);
      return;
    }

    if (state.phase !== 'cooking') {
      return;
    }

    const step = state.recipe.steps[state.stepIndex];
    if (!step) {
      return;
    }

    const enteredStep =
      !previous || previous.phase !== 'cooking' || previous.stepIndex !== state.stepIndex;

    if (enteredStep) {
      if (skipFirstSpeechRef.current) {
        skipFirstSpeechRef.current = false;
        return;
      }

      audio.stopSpeak();
      audio.speak(step.speak ?? step.text, { enabled: speechEnabled, rate: speechRate });
      return;
    }

    if (previous.stepState === 'running' && state.stepState === 'awaiting') {
      const nextStep = state.recipe.steps[state.stepIndex + 1];
      audio.chime();
      vibrate([200, 100, 200]);
      audio.speak(
        nextStep ? `下一步，${nextStep.speak ?? nextStep.text}` : '最后一步完成，可以出锅了',
        {
          enabled: speechEnabled,
          rate: speechRate,
        },
      );
    }
  }, [state, speechEnabled, speechRate]);

  const value = useMemo<CookContextValue>(
    () => ({
      state,
      resumeInfo,
      prepare,
      begin,
      startCooking,
      resume,
      discardResume,
      reset,
      dispatch,
    }),
    [state, resumeInfo, prepare, begin, startCooking, resume, discardResume, reset, dispatch],
  );

  if (booting) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-8 text-center">
        <p className="text-sm text-[var(--muted)]">正在回到灶台…</p>
      </main>
    );
  }

  return <CookContext.Provider value={value}>{children}</CookContext.Provider>;
}

export function useCook(): CookContextValue {
  const value = useContext(CookContext);

  if (!value) {
    throw new Error('useCook must be used inside CookProvider');
  }

  return value;
}
