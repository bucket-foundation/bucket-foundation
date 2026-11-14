import { bcp47, pickVoice } from "../speak";
import type { Line, Sfx, Track } from "./script";
import { saveMix, type Mix } from "./mix";
import { playSfx } from "./sfx";
import { hz, SONGS, type Song } from "./songs";
import { Synth } from "./synth";

export { hz, SONGS } from "./songs";
export { loadMix, type Mix } from "./mix";

const NICE_VOICE = /(premium|enhanced|natural|neural|siri|google us english|samantha|ava|zoe|aria|jenny)/i;

export class Stage {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private synth: Synth | null = null;
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
      this.synth = new Synth(ctx, this.noise);
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

  private osc(type: OscillatorType, freq: number, t: number, dur: number, peak: number, bus: AudioNode, attack = 0.005): OscillatorNode {
    return this.synth!.osc(type, freq, t, dur, peak, bus, attack);
  }

  private noiseHit(t: number, dur: number, peak: number, type: BiquadFilterType, freq: number, bus: AudioNode): void {
    this.synth!.noiseHit(t, dur, peak, type, freq, bus);
  }

  sfx(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.mix.sfx) return;
    playSfx(this.synth!, name, ctx.currentTime + 0.01, this.sfxBus!);
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
