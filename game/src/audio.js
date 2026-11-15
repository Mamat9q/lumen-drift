// audio.js — every sound in LUMEN DRIFT is synthesized live with WebAudio.
// No audio files ship with the game; the SoundEngine builds SFX and a music
// loop from oscillators and filtered noise, and stays silent until the first
// user gesture (the browser's autoplay rule).
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.noiseBuf = null;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq, type = 'lowpass', when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(this.sfxGain);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  shoot() { this.tone(880, 0.09, 'square', 0.10, 220); }
  enemyDie() { this.noise(0.22, 0.35, 900); this.tone(160, 0.22, 'sine', 0.35, 40); }
  playerHit() { this.noise(0.35, 0.5, 500); this.tone(220, 0.3, 'sawtooth', 0.3, 55); }
  pickup() { this.tone(1320, 0.07, 'sine', 0.16, 1980); }
  dash() { this.noise(0.25, 0.3, 2400, 'bandpass'); }
  gateHit() { this.tone(98, 0.4, 'sawtooth', 0.35, 49); this.noise(0.3, 0.3, 300); }
  waveClear() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, 0, i * 0.09)); }
  bossAlarm() { this.tone(110, 0.5, 'sawtooth', 0.3, 82); this.tone(110, 0.5, 'sawtooth', 0.3, 82, 0.55); }
  overdrive() { [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.12, 'square', 0.14, 0, i * 0.05)); }
  upgrade() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.2, 0, i * 0.07)); }
  gameOver() { [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.25, 0, i * 0.18)); }
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.22, 0, i * 0.11)); }

  // A 16-step loop: driving bass, hats and a slow pad. Scheduled ahead so it
  // never drifts; start/stop with the game.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 58.3, 0, 73.4, 0];
    const stepDur = 60 / 132 / 2;
    this.musicStep = 0;
    const tick = () => {
      if (!this.ctx) return;
      const step = this.musicStep % 16;
      const t0 = this.ctx.currentTime;
      if (bass[step]) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.value = bass[step];
        f.type = 'lowpass';
        f.frequency.value = 320;
        g.gain.setValueAtTime(0.5, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + stepDur * 1.8);
        o.connect(f).connect(g).connect(this.musicGain);
        o.start(t0);
        o.stop(t0 + stepDur * 2);
      }
      if (step % 2 === 0) {
        const s = this.ctx.createBufferSource();
        s.buffer = this.noiseBuf;
        const hf = this.ctx.createBiquadFilter();
        hf.type = 'highpass';
        hf.frequency.value = 6000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(step % 4 === 2 ? 0.10 : 0.05, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
        s.connect(hf).connect(g).connect(this.musicGain);
        s.start(t0);
        s.stop(t0 + 0.05);
      }
      if (step === 0 || step === 8) {
        [220, 277, 330].forEach((fr) => {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'triangle';
          o.frequency.value = fr;
          g.gain.setValueAtTime(0.05, t0);
          g.gain.linearRampToValueAtTime(0.09, t0 + stepDur * 4);
          g.gain.linearRampToValueAtTime(0.0001, t0 + stepDur * 8);
          o.connect(g).connect(this.musicGain);
          o.start(t0);
          o.stop(t0 + stepDur * 8);
        });
      }
      this.musicStep++;
    };
    tick();
    this.musicTimer = setInterval(tick, stepDur * 1000);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
