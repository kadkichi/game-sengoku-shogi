/**
 * 効果音。Web Audio で合成するので音声ファイルは不要。
 * 差し替えるときは play() の中身を audio 要素の再生に変えればよい。
 */
export type SoundName = 'select' | 'move' | 'capture' | 'clash' | 'promote' | 'skill' | 'shoot' | 'danger' | 'win' | 'draw' | 'tap' | 'horagai';

let ctx: AudioContext | null = null;
let muted = false;

export const isMuted = () => muted;
export const setMuted = (value: boolean) => {
  muted = value;
};

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'triangle', vol = 0.18) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** 太鼓・駒音のような短い打撃音 */
function thump(ac: AudioContext, start: number, freq = 140, dur = 0.18, vol = 0.5) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.45, start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(ac: AudioContext, start: number, dur: number, vol = 0.3) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(vol, start);
  src.connect(gain).connect(ac.destination);
  src.start(start);
}

/**
 * 法螺貝の「ブオォ〜」。低いのこぎり波をこもらせ、少し揺らしながら音程を上げ下げする。
 * 1回目は短く、2回目を長く吹く
 */
function horagai(ac: AudioContext, start: number) {
  const blow = (t0: number, dur: number, base: number) => {
    const out = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.linearRampToValueAtTime(1300, t0 + dur * 0.35);
    filter.frequency.linearRampToValueAtTime(700, t0 + dur);
    filter.Q.value = 4;
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.32, t0 + 0.18);
    out.gain.setValueAtTime(0.32, t0 + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    filter.connect(out).connect(ac.destination);
    // ゆらぎ (ビブラート)
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = base * 0.012;
    lfo.connect(lfoGain);
    for (const [mul, vol, type] of [
      [1, 0.6, 'sawtooth'],
      [2, 0.25, 'sawtooth'],
      [3, 0.12, 'triangle'],
    ] as [number, number, OscillatorType][]) {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      // 吹きはじめは低めから すくい上げ、終わりに少し下がる
      osc.frequency.setValueAtTime(base * mul * 0.88, t0);
      osc.frequency.exponentialRampToValueAtTime(base * mul, t0 + 0.22);
      osc.frequency.setValueAtTime(base * mul, t0 + dur * 0.75);
      osc.frequency.exponentialRampToValueAtTime(base * mul * 0.94, t0 + dur);
      lfoGain.connect(osc.frequency);
      g.gain.value = vol;
      osc.connect(g).connect(filter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
    noise(ac, t0, 0.15, 0.05);
  };
  blow(start, 0.7, 116);
  blow(start + 0.85, 1.7, 116);
}

export function play(name: SoundName) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case 'tap':
      tone(ac, 660, t, 0.08, 'sine', 0.12);
      break;
    case 'select':
      tone(ac, 880, t, 0.09, 'sine', 0.14);
      break;
    case 'move':
      thump(ac, t, 220, 0.12, 0.45);
      noise(ac, t, 0.04, 0.15);
      break;
    case 'capture':
      thump(ac, t, 180, 0.14, 0.5);
      tone(ac, 523, t + 0.08, 0.12);
      tone(ac, 784, t + 0.18, 0.2);
      break;
    case 'clash':
      // 刀がぶつかる「カキン」: 高い金属音を重ねて、短いノイズを添える
      noise(ac, t, 0.06, 0.35);
      [2093, 2637, 3136].forEach((f, i) => tone(ac, f, t + i * 0.01, 0.35 - i * 0.08, 'triangle', 0.09));
      tone(ac, 1568, t + 0.12, 0.25, 'square', 0.03);
      thump(ac, t + 0.02, 160, 0.12, 0.35);
      break;
    case 'promote':
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.07, 0.22, 'triangle', 0.16));
      break;
    case 'skill':
      thump(ac, t, 110, 0.35, 0.7);
      thump(ac, t + 0.18, 110, 0.35, 0.7);
      [392, 494, 587].forEach((f) => tone(ac, f, t + 0.36, 0.6, 'sawtooth', 0.06));
      break;
    case 'shoot':
      noise(ac, t, 0.25, 0.5);
      thump(ac, t, 90, 0.3, 0.6);
      break;
    case 'danger':
      tone(ac, 740, t, 0.12, 'square', 0.06);
      tone(ac, 740, t + 0.18, 0.12, 'square', 0.06);
      break;
    case 'win':
      [523, 659, 784].forEach((f, i) => tone(ac, f, t + i * 0.14, 0.2, 'triangle', 0.18));
      [523, 659, 784, 1047].forEach((f) => tone(ac, f, t + 0.5, 0.9, 'triangle', 0.1));
      thump(ac, t + 0.5, 110, 0.4, 0.6);
      break;
    case 'horagai':
      horagai(ac, t);
      break;
    case 'draw':
      tone(ac, 392, t, 0.3, 'triangle', 0.15);
      tone(ac, 330, t + 0.3, 0.5, 'triangle', 0.15);
      break;
  }
}
