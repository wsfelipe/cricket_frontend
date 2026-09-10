export type SoundName = "roll" | "announcement" | "challenge" | "victory";

type Tone = { freq: number; dur: number; type: OscillatorType; delay: number };

const RECIPES: Record<SoundName, Tone[]> = {
  roll: [
    { freq: 180, dur: 0.06, type: "square", delay: 0 },
    { freq: 240, dur: 0.05, type: "square", delay: 0.08 },
    { freq: 150, dur: 0.08, type: "square", delay: 0.16 },
  ],
  announcement: [
    { freq: 520, dur: 0.1, type: "triangle", delay: 0 },
    { freq: 700, dur: 0.12, type: "triangle", delay: 0.1 },
  ],
  challenge: [
    { freq: 300, dur: 0.12, type: "sawtooth", delay: 0 },
    { freq: 200, dur: 0.18, type: "sawtooth", delay: 0.12 },
  ],
  victory: [
    { freq: 523, dur: 0.12, type: "triangle", delay: 0 },
    { freq: 659, dur: 0.12, type: "triangle", delay: 0.12 },
    { freq: 784, dur: 0.2, type: "triangle", delay: 0.24 },
  ],
};

const STORAGE_KEY = "cricket.sound";

let context: AudioContext | null = null;
let enabled = false;
let unlocked = false;
const listeners = new Set<(enabled: boolean) => void>();

export function initAudioPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    enabled = true;
  }
  notify();
  return enabled;
}

function notify() {
  listeners.forEach((listener) => listener(enabled));
}

export function onAudioChange(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/** Must be called from a user gesture (browser autoplay policy). */
export function unlockAudio(): void {
  if (typeof window === "undefined" || unlocked) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    void context.resume();
    unlocked = true;
  } catch {
    context = null;
  }
}

export function setAudioEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    /* noop */
  }
  if (next) unlockAudio();
  notify();
}

export function playSound(name: SoundName): void {
  if (!enabled || !unlocked || !context) return;
  const ctx = context;
  RECIPES[name].forEach(({ freq, dur, type, delay }) => {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });
}
