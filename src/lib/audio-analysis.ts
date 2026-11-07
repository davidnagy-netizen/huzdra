// Böngészőben futó hangelemzés feltöltéskor: hossz, tempó (BPM) és hangnem becslése.
// Ugyanaz a módszer, mint a referenciafelvételek elemzésénél: onset-görbe autokorrelációja
// (tempó) és kromagram + Krumhansl-profil korreláció (hangnem). Becslés – az admin felülírhatja.

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];
const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function corr(a: number[], b: number[]) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
}

export interface AudioAnalysis { durationSec: number; bpm: number | null; musicalKey: string | null }

export const ANALYSIS_SR = 11025;

/** Tiszta számítás (tesztelhető): mono minták ~11 kHz-en → tempó + hangnem. */
export function analyzeSamples(x: Float32Array, sr: number): { bpm: number | null; musicalKey: string | null } {
  const len = x.length;
  // --- tempó: spektrális fluxus (log-magnitúdó növekmény) + autokorreláció, 120 BPM köré súlyozva
  const W = 512, hop = 128;
  const re = new Float64Array(W), im = new Float64Array(W);
  const hann = new Float64Array(W).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (W - 1)));
  let prevMag: Float64Array | null = null;
  const env: number[] = [];
  for (let start = 0; start + W < len; start += hop) {
    for (let i = 0; i < W; i++) { re[i] = x[start + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(W / 2);
    let flux = 0;
    for (let k = 0; k < W / 2; k++) {
      mag[k] = Math.log1p(Math.hypot(re[k], im[k]));
      if (prevMag) flux += Math.max(0, mag[k] - prevMag[k]);
    }
    if (prevMag) env.push(flux);
    prevMag = mag;
  }
  const mean = env.reduce((s, v) => s + v, 0) / Math.max(1, env.length);
  const e = env.map((v) => v - mean);
  const fps = sr / hop;
  let bestBpm: number | null = null, best = -Infinity;
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = (60 * fps) / bpm;
    const l0 = Math.floor(lag), fr = lag - l0;
    let s = 0;
    for (let i = 0; i + l0 + 1 < e.length; i++) s += e[i] * (e[i + l0] * (1 - fr) + e[i + l0 + 1] * fr);
    s /= Math.max(1, e.length - l0);
    s *= Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s > best) { best = s; bestBpm = bpm; }
  }
  // --- hangnem: kromagram (60–2000 Hz) + Krumhansl-profilok
  const N = 4096, chroma = new Array(12).fill(0);
  const re2 = new Float64Array(N), im2 = new Float64Array(N);
  for (let start = 0; start + N < Math.min(len, sr * 30); start += N / 2) {
    for (let i = 0; i < N; i++) { re2[i] = x[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))); im2[i] = 0; }
    fft(re2, im2);
    for (let k = 1; k < N / 2; k++) {
      const f = (k * sr) / N;
      if (f < 60 || f > 2000) continue;
      const pc = ((Math.round(12 * Math.log2(f / 261.63)) % 12) + 12) % 12;
      chroma[pc] += Math.hypot(re2[k], im2[k]);
    }
  }
  const scores: { key: string; r: number }[] = [];
  for (let r = 0; r < 12; r++) {
    const rot = (p: number[]) => p.map((_, i) => p[(i - r + 12) % 12]);
    scores.push({ key: `${NOTES[r]}-dúr`, r: corr(rot(MAJ), chroma) }, { key: `${NOTES[r]}-moll`, r: corr(rot(MIN), chroma) });
  }
  scores.sort((a, b) => b.r - a.r);
  // ha a második jelölt nagyon közel van, a becslés bizonytalan → "?" jelzi, hogy fülre érdemes ellenőrizni
  const ambiguous = scores[0].r - scores[1].r < 0.03;
  const key = chroma.some((c) => c > 0) ? `${scores[0].key}${ambiguous ? "?" : ""}` : null;
  return { bpm: bestBpm ? Math.round(bestBpm) : null, musicalKey: key };
}

/** Böngészőben: dekódolás, szűrt átmintavételezés ~11 kHz-re (aliasing nélkül), max. 60 mp. */
export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const durationSec = Math.round(buf.duration * 10) / 10;
    const seconds = Math.min(buf.duration, 60);
    const off = new OfflineAudioContext(1, Math.ceil(seconds * ANALYSIS_SR), ANALYSIS_SR);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start(0);
    const rendered = await off.startRendering();
    return { durationSec, ...analyzeSamples(rendered.getChannelData(0), ANALYSIS_SR) };
  } finally {
    ctx.close().catch(() => {});
  }
}
