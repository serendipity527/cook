import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './audio';

class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function createSynth() {
  return {
    speaking: false,
    pending: false,
    paused: false,
    cancel: vi.fn(),
    resume: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => []),
    addEventListener: vi.fn(),
  };
}

let synth: ReturnType<typeof createSynth>;

beforeEach(() => {
  synth = createSynth();
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: synth,
  });
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'speechSynthesis');
});

describe('AudioEngine speech', () => {
  it('reports unsupported when the browser has no speech synthesis', () => {
    Reflect.deleteProperty(window, 'speechSynthesis');
    vi.unstubAllGlobals();

    const engine = new AudioEngine();

    expect(engine.isSpeechSupported()).toBe(false);
    expect(engine.speak('你好')).toBe(false);
  });

  it('speaks a Chinese utterance', () => {
    const engine = new AudioEngine();

    expect(engine.speak('把鸡蛋打散', { rate: 1.1 })).toBe(true);
    expect(synth.speak).toHaveBeenCalledTimes(1);

    const utterance = synth.speak.mock.calls[0]?.[0] as MockUtterance;
    expect(utterance.text).toBe('把鸡蛋打散');
    expect(utterance.lang).toBe('zh-CN');
    expect(utterance.rate).toBe(1.1);
  });

  it('respects the disabled option and empty text', () => {
    const engine = new AudioEngine();

    expect(engine.speak('不要念', { enabled: false })).toBe(false);
    expect(engine.speak('   ')).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('waits briefly after cancel before speaking again', () => {
    vi.useFakeTimers();
    const engine = new AudioEngine();

    synth.speaking = true;
    expect(engine.speak('下一步')).toBe(true);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).not.toHaveBeenCalled();

    vi.advanceTimersByTime(80);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('primes speech during unlock', () => {
    vi.useFakeTimers();
    const engine = new AudioEngine();

    void engine.unlock();

    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0]?.[0] as MockUtterance;
    expect(utterance.volume).toBe(0);
  });
});
