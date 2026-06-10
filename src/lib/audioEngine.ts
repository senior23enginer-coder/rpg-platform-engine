export type TrackCategory = "background" | "combat" | "exploration" | "vault" | "day" | "night";

let currentAudio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let generatedTimer: number | null = null;
let musicVolume = 0.35;

export function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if (generatedTimer) {
    window.clearInterval(generatedTimer);
    generatedTimer = null;
  }
}

export async function playGenerated(category: TrackCategory) {
  stopAudio();

  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const notesByCategory: Record<TrackCategory, number[]> = {
    background: [110, 146, 196, 220],
    combat: [98, 110, 130, 164],
    exploration: [130, 164, 196, 247],
    vault: [72, 91, 110, 146],
    day: [164, 196, 247, 294],
    night: [82, 110, 130, 164],
  };

  const notes = notesByCategory[category];

  generatedTimer = window.setInterval(() => {
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = category === "combat" ? "sawtooth" : "sine";
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    filter.type = "lowpass";
    filter.frequency.value = category === "combat" ? 1200 : 700;
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    gain.gain.linearRampToValueAtTime(category === "combat" ? 0.045 : 0.028, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.0001, now + (category === "combat" ? 1.1 : 3.2));
    osc.stop(now + (category === "combat" ? 1.2 : 3.4));
  }, category === "combat" ? 420 : 1600);
}

export function playFile(pathOrUrl: string) {
  stopAudio();
  currentAudio = new Audio(pathOrUrl);
  currentAudio.loop = true;
  currentAudio.volume = musicVolume;
  currentAudio.play().catch(console.warn);
}

export function setMusicVolume(value: number) {
  musicVolume = Math.max(0, Math.min(1, value));
  if (currentAudio) currentAudio.volume = musicVolume;
}

export function pauseAudio() {
  currentAudio?.pause();
}

export function resumeAudio() {
  currentAudio?.play().catch(console.warn);
}

export function playTrack(pathOrUrl?: string, fallbackCategory: TrackCategory = "background") {
  if (pathOrUrl) {
    playFile(pathOrUrl);
    return;
  }

  void playGenerated(fallbackCategory);
}
