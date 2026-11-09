import { bcp47, pickVoice } from "../speak";
import type { Line, Sfx, Track } from "./script";

type Song = { bpm: number; chords: number[][]; bass: number[]; arp: number[]; melody?: (number | null)[] };

export const SONGS: Record<Exclude<Track, "silent">, Song> = {
  lobby: {
    bpm: 98,
    chords: [[62, 65, 69, 72], [67, 71, 74, 77], [69, 72, 76, 79], [67, 71, 74, 77]],
    bass: [38, 43, 45, 43],
    arp: [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 3, 1, 2, 0, 1],
    melody: [74, null, 77, null, 76, 74, null, 72, 69, null, 72, null, 74, null, null, null],
  },
  question: {
    bpm: 128,
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]],
    bass: [33, 29, 31, 28],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2, 1, 0],
  },
  reveal: {
    bpm: 90,
    chords: [[60, 64, 67, 72], [60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79]],
    bass: [36, 36, 41, 43],
    arp: [0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2],
  },
  board: {
    bpm: 112,
    chords: [[65, 69, 72, 76], [60, 64, 67, 72], [67, 71, 74, 79], [69, 72, 76, 81]],
    bass: [41, 36, 43, 45],
    arp: [0, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 0, 3, 2, 1, 0],
    melody: [76, null, 79, 77, 76, null, 72, null, 74, 76, null, 79, 81, null, null, null],
  },
  finale: {
    bpm: 120,
    chords: [[58, 62, 65, 70], [63, 67, 70, 75], [65, 69, 72, 77], [58, 62, 65, 70]],
    bass: [34, 39, 41, 34],
    arp: [0, 1, 2, 3, 2, 3, 1, 2, 0, 1, 2, 3, 3, 2, 1, 0],
    melody: [82, null, 82, 84, 86, null, 84, 82, 79, null, 82, null, 77, null, null, null],
  },
};

export function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type Mix = { music: boolean; voice: boolean; sfx: boolean };

const MIX_KEY = "stoa/mix/v1";

export function loadMix(fallback: Mix): Mix {
  try {
    const raw = localStorage.getItem(MIX_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Mix>) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveMix(mix: Mix): void {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    return;
  }
}

const NICE_VOICE = /(premium|enhanced|natural|neural|siri|google us english|samantha|ava|zoe|aria|jenny)/i;

export class Stage {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private track: Track = "silent";
  private pending: Track | null = null;
  private bar = 0;
  private nextBar = 0;
  private layers = 1;
  private urgent = false;
  private speaking = 0;
  private queue: Line[] = [];
  private gen = 0;
  private current: SpeechSynthesisUtterance | null = null;
  onReady: ((ready: boolean) => void) | null = null;
  mix: Mix;

  constructor(mix: Mix) {
    this.mix = mix;
  }

  get ready(): boolean {
    return this.ctx?.state === "running";
  }

  unlock(): void {
    if (typeof window === "undefined") return;
    if (this.ctx?.state === "running") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(ctx.destination);
      this.filter = ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 9000;
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.mix.music ? 0.32 : 0;
      this.musicBus.connect(this.filter).connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.mix.sfx ? 0.7 : 0;
      this.sfxBus.connect(this.master);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      ctx.onstatechange = () => {
        if (this.ctx === ctx) this.onReady?.(ctx.state === "running");
      };
      this.timer = setInterval(() => this.schedule(), 40);
      this.nextBar = ctx.currentTime + 0.05;
      this.bar = 0;
    }
    const ctx = this.ctx;
    void ctx.resume().then(() => this.onReady?.(ctx.state === "running"), () => this.onReady?.(false));
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  }

  setMix(mix: Mix): void {
    this.mix = mix;
    saveMix(mix);
    const t = this.ctx?.currentTime ?? 0;
    this.musicBus?.gain.setTargetAtTime(mix.music ? (this.speaking ? 0.1 : 0.32) : 0, t, 0.08);
    this.sfxBus?.gain.setTargetAtTime(mix.sfx ? 0.7 : 0, t, 0.05);
    if (!mix.voice) this.hush();
  }

  play(track: Track): void {
    if (track === this.track && !this.pending) return;
    if (!this.ctx) {
      this.track = track;
      return;
    }
    if (this.track === "silent" || track === "silent" || track === "reveal") {
      this.track = track;
      this.pending = null;
      this.bar = 0;
      this.nextBar = this.ctx.currentTime + 0.05;
    } else this.pending = track;
  }

  setLayers(n: number): void {
    this.layers = Math.max(0, Math.min(3, n));
  }

  setUrgent(on: boolean): void {
    if (on === this.urgent) return;
    this.urgent = on;
    const t = this.ctx?.currentTime ?? 0;
    this.filter?.frequency.setTargetAtTime(on ? 14000 : 9000, t, 0.2);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.hush();
    void this.ctx?.close();
    this.ctx = null;
    this.track = "silent";
    this.pending = null;
    this.onReady?.(false);
  }

  private hush(): void {
    this.gen++;
    this.queue = [];
    this.current = null;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.duck(false);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const ahead = typeof document !== "undefined" && document.hidden ? 1.5 : 0.25;
    if (this.nextBar < ctx.currentTime) this.nextBar = ctx.currentTime + 0.05;
    while (this.track !== "silent" && this.nextBar < ctx.currentTime + ahead) {
      if (this.pending && this.bar % 2 === 0) {
        this.track = this.pending;
        this.pending = null;
        this.bar = 0;
      }
      if (this.track === "silent") return;
      const song = SONGS[this.track];
      const beat = 60 / song.bpm;
      this.bar1(song, this.nextBar, beat);
      this.nextBar += beat * 4;
      this.bar++;
    }
  }

  private bar1(song: Song, t0: number, beat: number): void {
    const step = beat / 4;
    const ci = this.bar % song.chords.length;
    const chord = song.chords[ci];
    const track = this.track;
    const layers = track === "lobby" ? this.layers : track === "reveal" ? 0 : 3;
    this.pad(t0, chord, beat * 4);
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * step;
      if (track === "reveal") continue;
      if (s % 4 === 0 || (track === "lobby" && s === 10)) this.bass(t, song.bass[ci] + (s === 8 ? 12 : 0), step * 3);
      if (track === "question" && s % 2 === 1) this.bass(t, song.bass[ci] + 12, step * 1.5, 0.12);
      if (layers >= 1) {
        if (s % 4 === 0 && (track !== "lobby" || s % 8 === 0 || s === 10)) this.kick(t);
        if ((track === "question" || this.urgent) ? true : s % 4 === 2) this.hat(t, s % 4 === 2 ? 0.09 : 0.04);
        if (s === 4 || s === 12) this.clap(t);
      }
      if (layers >= 2) this.pluck(t, chord[song.arp[s] % chord.length] + 12, step * 1.6, track === "question" ? 0.05 : 0.06);
      if (layers >= 3 && song.melody) {
        const m = song.melody[s];
        if (m != null && this.bar % 4 < 2) this.bell(t, m, beat * 1.2, 0.07);
      }
    }
    if (this.urgent && track === "question") for (let b = 0; b < 4; b++) this.bell(t0 + b * beat, 93, 0.12, 0.05);
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, peak: number, bus: AudioNode, attack = 0.005): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    this.env(g, t, peak, attack, dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  private noiseHit(t: number, dur: number, peak: number, type: BiquadFilterType, freq: number, bus: AudioNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const o = this.osc("sine", 150, t, 0.22, 0.55, this.musicBus!);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  }

  private hat(t: number, peak: number): void {
    this.noiseHit(t, 0.04, peak, "highpass", 7500, this.musicBus!);
  }

  private clap(t: number): void {
    this.noiseHit(t, 0.12, 0.16, "bandpass", 1600, this.musicBus!);
  }

  private bass(t: number, midi: number, dur: number, peak = 0.2): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 520;
    f.connect(this.musicBus!);
    this.osc("sawtooth", hz(midi), t, dur, peak, f);
  }

  private pluck(t: number, midi: number, dur: number, peak: number): void {
    this.osc("triangle", hz(midi), t, dur, peak, this.musicBus!);
  }

  private bell(t: number, midi: number, dur: number, peak: number): void {
    this.osc("sine", hz(midi), t, dur, peak, this.musicBus!);
    this.osc("sine", hz(midi) * 2.01, t, dur * 0.5, peak * 0.3, this.musicBus!);
  }

  private pad(t: number, chord: number[], dur: number): void {
    for (const m of chord.slice(0, 3)) {
      this.osc("triangle", hz(m - 12) * 1.003, t, dur * 0.9, 0.035, this.musicBus!, dur * 0.25);
      this.osc("sine", hz(m - 12) * 0.997, t, dur * 0.9, 0.035, this.musicBus!, dur * 0.25);
    }
  }

  sfx(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.mix.sfx) return;
    const t = ctx.currentTime + 0.01;
    const bus = this.sfxBus!;
    const up = (notes: number[], gap: number, type: OscillatorType, peak: number, dur = 0.25) => notes.forEach((n, i) => this.osc(type, hz(n), t + i * gap, dur, peak, bus));
    if (name === "join") {
      const o = this.osc("sine", 520, t, 0.16, 0.35, bus);
      o.frequency.exponentialRampToValueAtTime(1300, t + 0.1);
    } else if (name === "open") {
      up([72, 79, 84], 0.06, "triangle", 0.3, 0.3);
      this.noiseHit(t, 0.35, 0.12, "bandpass", 3000, bus);
    } else if (name === "lock") {
      this.osc("square", 880, t, 0.05, 0.08, bus);
      this.noiseHit(t, 0.03, 0.15, "highpass", 4000, bus);
    } else if (name === "tick") this.osc("sine", 1200, t, 0.06, 0.25, bus);
    else if (name === "tock") {
      this.osc("square", 660, t, 0.1, 0.18, bus);
      this.osc("sine", 1320, t, 0.08, 0.2, bus);
    } else if (name === "reveal") {
      const ctx2 = ctx;
      const src = ctx2.createBufferSource();
      src.buffer = this.noise;
      const f = ctx2.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2;
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(6000, t + 0.45);
      const g = ctx2.createGain();
      this.env(g, t, 0.35, 0.3, 0.25);
      src.connect(f).connect(g).connect(bus);
      src.start(t);
      src.stop(t + 0.7);
      [60, 64, 67, 72].forEach((n) => this.osc("triangle", hz(n), t + 0.45, 0.9, 0.16, bus, 0.01));
    } else if (name === "right") up([72, 76, 79, 84], 0.07, "triangle", 0.35, 0.35);
    else if (name === "streak") {
      up([72, 76, 79, 84, 88, 91], 0.05, "triangle", 0.32, 0.3);
      this.noiseHit(t + 0.3, 0.5, 0.1, "highpass", 6000, bus);
    } else if (name === "wrong") {
      const o = this.osc("sawtooth", 220, t, 0.4, 0.2, bus);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.35);
    } else if (name === "whoosh") {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(5000, t);
      f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
      const g = ctx.createGain();
      this.env(g, t, 0.3, 0.08, 0.35);
      src.connect(f).connect(g).connect(bus);
      src.start(t);
      src.stop(t + 0.5);
    } else if (name === "climb") up([67, 72], 0.08, "sine", 0.25, 0.2);
    else if (name === "fanfare") {
      [[70, 74, 77], [70, 74, 77], [75, 79, 82], [77, 81, 84], [82, 86, 89]].forEach((c, i) => {
        const at = t + [0, 0.18, 0.36, 0.62, 0.9][i];
        c.forEach((n) => this.osc("sawtooth", hz(n), at, i === 4 ? 1.4 : 0.16, 0.06, bus));
        c.forEach((n) => this.osc("triangle", hz(n), at, i === 4 ? 1.4 : 0.16, 0.1, bus));
      });
      for (let i = 0; i < 12; i++) this.noiseHit(t + 0.9 + i * 0.04, 0.05, 0.08, "bandpass", 2500 + i * 300, bus);
    }
  }

  note(i: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.mix.sfx) return;
    const scale = [72, 76, 79, 83];
    this.osc("triangle", hz(scale[i % 4]), ctx.currentTime + 0.01, 0.3, 0.3, this.sfxBus!);
  }

  say(lines: Line[]): void {
    if (!this.mix.voice || typeof speechSynthesis === "undefined" || !lines.length) return;
    this.hush();
    this.queue = [...lines];
    this.next(this.gen);
  }

  private next(gen: number): void {
    if (gen !== this.gen) return;
    const line = this.queue.shift();
    if (!line) {
      this.duck(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(line.text);
    const voices = speechSynthesis.getVoices();
    if (line.lang) {
      const tag = bcp47(line.lang);
      const v = pickVoice(voices, tag);
      if (!v) return this.next(gen);
      u.voice = v;
      u.lang = tag;
      u.rate = 0.85;
    } else {
      const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const v = en.find((x) => NICE_VOICE.test(x.name)) ?? en.find((x) => x.lang === "en-US") ?? en[0];
      if (v) u.voice = v;
      u.lang = "en-US";
      u.rate = 1.04;
      u.pitch = 1.08;
    }
    u.onstart = () => gen === this.gen && this.duck(true);
    u.onend = () => setTimeout(() => this.next(gen), line.word ? 350 : 120);
    u.onerror = () => this.next(gen);
    this.current = u;
    speechSynthesis.speak(u);
  }

  private duck(on: boolean): void {
    this.speaking = on ? 1 : 0;
    const t = this.ctx?.currentTime ?? 0;
    if (this.mix.music) this.musicBus?.gain.setTargetAtTime(on ? 0.1 : 0.32, t, 0.12);
  }
}

export function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    return;
  }
}
