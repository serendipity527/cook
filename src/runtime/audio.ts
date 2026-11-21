export interface SpeakOptions {
  rate?: number;
  enabled?: boolean;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private unlocked = false;
  private voices: SpeechSynthesisVoice[] = [];
  private speechPrimed = false;
  private priming = false;
  private speakTimer: number | null = null;
  private speakToken = 0;
  private lastCancelAt = 0;

  constructor() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    this.loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', () => this.loadVoices());
  }

  private loadVoices(): void {
    this.voices = window.speechSynthesis?.getVoices() ?? [];
  }

  isSpeechSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    );
  }

  /**
   * 移动端浏览器要求第一次发声发生在用户手势里。
   * 在点击时播一句静音内容，后续计时器触发的播报才不会被拦截。
   */
  private primeSpeech(): void {
    if (this.speechPrimed || !this.isSpeechSupported()) {
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.lang = 'zh-CN';
      utterance.volume = 0;
      utterance.rate = 10;
      utterance.onend = () => {
        this.priming = false;
      };
      utterance.onerror = () => {
        this.priming = false;
      };

      this.priming = true;
      this.speechPrimed = true;
      window.speechSynthesis.speak(utterance);

      // 个别浏览器不触发静音试播的 onend，避免一直以为还在预热
      window.setTimeout(() => {
        this.priming = false;
      }, 1500);
    } catch {
      this.priming = false;
    }
  }

  async unlock(): Promise<void> {
    this.primeSpeech();

    if (this.unlocked) {
      return;
    }

    const AudioConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioConstructor) {
      try {
        const context = new AudioConstructor();
        await context.resume();

        const buffer = context.createBuffer(1, 1, 22_050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        this.context = context;
      } catch {
        // 音频不可用时仍允许做菜，由铃声降级为静音
      }
    }

    this.unlocked = true;
  }

  chime(): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const start = context.currentTime;
    const tones: Array<[number, number]> = [
      [0, 880],
      [0.18, 1174],
    ];

    for (const [offset, frequency] of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start + offset);
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.7);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.75);
    }
  }

  speak(text: string, options: SpeakOptions = {}): boolean {
    if (options.enabled === false || text.trim() === '') {
      return false;
    }

    if (!this.isSpeechSupported()) {
      return false;
    }

    const synth = window.speechSynthesis;
    const token = ++this.speakToken;
    const wasPriming = this.priming;
    const busy = synth.speaking || synth.pending;

    if (busy && !wasPriming) {
      synth.cancel();
      this.lastCancelAt = Date.now();
    }

    try {
      synth.resume();
    } catch {
      // 部分浏览器没有暂停状态，忽略即可
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = Math.min(10, Math.max(0.5, options.rate ?? 1.05));
    utterance.onstart = () => {
      this.priming = false;
    };
    utterance.onerror = (event) => {
      this.priming = false;

      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('[kaihuo] speech synthesis failed', event.error);
      }
    };

    const voice = this.pickVoice();
    if (voice) {
      utterance.voice = voice;
    }

    const recentlyCancelled = Date.now() - this.lastCancelAt < 120;
    const delay = (busy && !wasPriming) || recentlyCancelled;

    if (delay) {
      // Chrome 在 cancel 后立刻 speak 偶尔会静音，隔一帧再播更稳。
      if (this.speakTimer !== null) {
        window.clearTimeout(this.speakTimer);
      }

      this.speakTimer = window.setTimeout(() => {
        this.speakTimer = null;

        if (token !== this.speakToken) {
          return;
        }

        this.safeSpeak(utterance);
      }, 80);
    } else {
      this.safeSpeak(utterance);
    }

    return true;
  }

  stopSpeak(): void {
    this.speakToken += 1;
    this.lastCancelAt = Date.now();

    if (this.speakTimer !== null) {
      window.clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  private safeSpeak(utterance: SpeechSynthesisUtterance): void {
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('[kaihuo] speech synthesis failed to start', error);
    }
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const chinese = this.voices.filter((voice) => voice.lang.toLowerCase().startsWith('zh'));

    return (
      chinese.find((voice) => voice.lang.toLowerCase().replace('_', '-').includes('cn')) ??
      chinese[0]
    );
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // 震动不可用时静默降级
  }
}

export const audio = new AudioEngine();
