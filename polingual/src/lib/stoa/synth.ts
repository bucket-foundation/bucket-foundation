export class Synth {
  constructor(private ctx: AudioContext, private noise: AudioBuffer | null) {}

  env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  osc(type: OscillatorType, freq: number, t: number, dur: number, peak: number, bus: AudioNode, attack = 0.005): OscillatorNode {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    this.env(g, t, peak, attack, dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  noiseHit(t: number, dur: number, peak: number, type: BiquadFilterType, freq: number, bus: AudioNode): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.002, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  sweep(t: number, from: number, to: number, ramp: number, q: number | null, env: [number, number, number], stop: number, bus: AudioNode): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    if (q !== null) f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + ramp);
    const g = this.ctx.createGain();
    this.env(g, t, env[0], env[1], env[2]);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + stop);
  }
}
