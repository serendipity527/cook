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
import { newId, saveSession } from '@/data/repo';
import { useAppStore } from '@/store/useAppStore';
import { audio } from './audio';
import {
  cookReducer,
  createInitialState,
  prepareCookState,
  reconcileAfterRestore,
  toSession,
  type CookEvent,
  type CookState,
} from './machine';
import { clearSnapshot, loadSnapshot, saveSnapshot } from './snapshot';
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

interface CookContextValue {
  state: CookState | null;
  hasResume: boolean;
  prepare: (recipe: Recipe) => void;
  begin: (recipe: Recipe) => void;
  startCooking: () => void;
  resume: () => boolean;
  reset: () => void;
  dispatch: (event: CookEvent) => void;
}

const CookContext = createContext<CookContextValue | null>(null);

export function CookProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(rootReducer, null);
  const [hasResume, setHasResume] = useState(() => loadSnapshot() !== null);
  const speechEnabled = useAppStore((selector) => selector.speechEnabled);
  const speechRate = useAppStore((selector) => selector.speechRate);
  const savedSessionRef = useRef<string | null>(null);
  const skipFirstSpeechRef = useRef(false);
  const previousStateRef = useRef<CookState | null>(null);

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
    setHasResume(false);
    clearSnapshot();
    rawDispatch({ type: 'begin', recipe, now: Date.now() });
  }, []);

  const startCooking = useCallback(() => {
    void audio.unlock();
    skipFirstSpeechRef.current = false;
    savedSessionRef.current = null;
    setHasResume(false);
    clearSnapshot();
    rawDispatch({ type: 'start', now: Date.now() });
  }, []);

  const resume = useCallback(() => {
    const snapshot = loadSnapshot();

    if (!snapshot) {
      setHasResume(false);
      return false;
    }

    const restored = reconcileAfterRestore(snapshot.state, Date.now());
    skipFirstSpeechRef.current = true;
    savedSessionRef.current = null;
    setHasResume(false);
    rawDispatch({ type: 'replace', state: restored });
    return true;
  }, []);

  const reset = useCallback(() => {
    audio.stopSpeak();
    clearSnapshot();
    savedSessionRef.current = null;
    setHasResume(false);
    rawDispatch({ type: 'replace', state: null });
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

    if (!state || state.phase !== 'cooking') {
      return;
    }

    const step = state.recipe.steps[state.stepIndex];
    if (!step) {
      return;
    }

    const enteredStep = !previous || previous.phase !== 'cooking' || previous.stepIndex !== state.stepIndex;

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
      audio.speak(nextStep ? `下一步，${nextStep.speak ?? nextStep.text}` : '最后一步完成，可以出锅了', {
        enabled: speechEnabled,
        rate: speechRate,
      });
    }
  }, [state, speechEnabled, speechRate]);

  const value = useMemo<CookContextValue>(
    () => ({
      state,
      hasResume,
      prepare,
      begin,
      startCooking,
      resume,
      reset,
      dispatch,
    }),
    [state, hasResume, prepare, begin, startCooking, resume, reset, dispatch],
  );

  return <CookContext.Provider value={value}>{children}</CookContext.Provider>;
}

export function useCook(): CookContextValue {
  const value = useContext(CookContext);

  if (!value) {
    throw new Error('useCook must be used inside CookProvider');
  }

  return value;
}
