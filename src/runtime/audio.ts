export interface SpeakOptions {
  rate?: number;
  enabled?: boolean;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private unlocked = false;
  private voices: SpeechSynthesisVoice[] = [];

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

  async unlock(): Promise<void> {
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

  speak(text: string, options: SpeakOptions = {}): void {
    if (options.enabled === false) {
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = options.rate ?? 1.05;

    const voice = this.voices.find((item) => item.lang.toLowerCase().startsWith('zh'));
    if (voice) {
      utterance.voice = voice;
    }

    synth.speak(utterance);
  }

  stopSpeak(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }
}

export const audio = new AudioEngine();
