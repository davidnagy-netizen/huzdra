// Helykitöltő zene-szintetizátor a mock módhoz: determinisztikus, rövid WAV dallam
// (dob + basszus + akkord + "hegedű" vagy "cimbalom" szólam). Nem valódi előadói hang!
// A WAV LIST/INFO chunkjába metaadatot írunk – ez a mock "vízjel"; élesben a
// WatermarkAdapter hallhatatlan audio vízjelet ágyaz be.

import type { Tempo } from "../types";

export interface SynthOptions {
  seed: string;
  tempo: Tempo;
  minor: boolean;
  lead: "violin" | "cimbalom" | "synth";
  seconds?: number;
  sampleRate?: number;
  metadata?: Record<string, string>;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function synthesizeWav(opts: SynthOptions): Buffer {
  const sr = opts.sampleRate ?? 16000;
  const seconds = opts.seconds ?? 24;
  const n = Math.floor(sr * seconds);
  const out = new Float32Array(n);
  const rand = rng(hashSeed(opts.seed));

  const bpm = opts.tempo === "lassu" ? 76 : opts.tempo === "kozepes" ? 108 : 138;
  const beat = 60 / bpm;
  const root = 57 + Math.floor(rand() * 5); // A3 körül
  // Magyar/roma ízű skála: moll esetén harmonikus moll (bő szekund), dúr esetén mixolíd
  const scale = opts.minor ? [0, 2, 3, 6, 7, 8, 11, 12] : [0, 2, 4, 5, 7, 9, 10, 12];
  const progression = opts.minor ? [0, 5, 7, 0] : [0, 5, 7, 7];
  const chordOf = (deg: number) =>
    opts.minor && deg === 0 ? [0, 3, 7] : opts.minor && deg === 5 ? [0, 4, 7] : [0, 4, 7];

  const barLen = beat * 4;
  // dallam generálása (8 ütemes frázis, ismétléssel – "refrén")
  const melody: { t: number; d: number; m: number }[] = [];
  const phrase: { off: number; d: number; deg: number }[] = [];
  let pos = 0;
  while (pos < 8 * 4) {
    const d = [0.5, 0.5, 1, 1, 1.5, 2][Math.floor(rand() * (opts.tempo === "lassu" ? 6 : 4))];
    phrase.push({ off: pos, d, deg: Math.floor(rand() * scale.length) });
    pos += d;
  }
  for (let rep = 0; rep * 8 * barLen < seconds; rep++) {
    for (const p of phrase) {
      melody.push({ t: rep * 8 * barLen + p.off * beat, d: p.d * beat, m: root + 12 + scale[p.deg] });
    }
  }

  // akkordok, basszus, dob
  for (let bar = 0; bar * barLen < seconds; bar++) {
    const deg = progression[bar % progression.length];
    const t0 = bar * barLen;
    const chord = chordOf(deg).map((iv) => root + deg + iv);
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * beat;
      // lagzis "um-pa": basszus az 1-3., akkord a 2-4. negyeden
      if (b % 2 === 0) addTone(out, sr, tb, beat * 0.9, midiToHz(root + deg - 12), 0.32, "bass");
      else chord.forEach((m) => addTone(out, sr, tb, beat * 0.6, midiToHz(m), 0.07, "pad"));
      addKick(out, sr, tb, b % 2 === 0 ? 0.5 : 0.18);
      if (opts.tempo !== "lassu") addHat(out, sr, tb + beat / 2, 0.05, rand);
    }
  }
  for (const note of melody) {
    if (note.t >= seconds) break;
    addTone(out, sr, note.t, note.d * 0.95, midiToHz(note.m), 0.16, opts.lead);
  }

  // fade in/out + normalizálás
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const fade = sr * 1.2;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = out[i] * gain;
    if (i < sr * 0.05) v *= i / (sr * 0.05);
    if (i > n - fade) v *= (n - i) / fade;
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), i * 2);
  }
  return encodeWav(pcm, sr, opts.metadata ?? {});
}

function addTone(
  out: Float32Array,
  sr: number,
  start: number,
  dur: number,
  hz: number,
  amp: number,
  kind: "bass" | "pad" | "violin" | "cimbalom" | "synth",
) {
  const s0 = Math.floor(start * sr);
  const len = Math.floor(dur * sr);
  for (let i = 0; i < len && s0 + i < out.length; i++) {
    const t = i / sr;
    let env: number;
    let v: number;
    switch (kind) {
      case "cimbalom": {
        env = Math.exp(-t * 5);
        const ph = 2 * Math.PI * hz * t;
        v = Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.3) + 0.25 * Math.sin(3.01 * ph) + 0.15 * Math.sin(4.02 * ph);
        v *= 0.55;
        break;
      }
      case "violin": {
        env = Math.min(1, t / 0.06) * Math.min(1, (dur - t) / 0.05);
        const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.2);
        const ph = (hz * vib * t) % 1;
        v = (2 * ph - 1) * 0.6 + 0.4 * Math.sin(2 * Math.PI * hz * vib * t);
        v *= 0.7;
        break;
      }
      case "synth": {
        env = Math.min(1, t / 0.01) * Math.exp(-t * 1.5);
        const ph = (hz * t) % 1;
        v = (ph < 0.5 ? 1 : -1) * 0.5;
        break;
      }
      case "bass":
        env = Math.exp(-t * 4);
        v = Math.sin(2 * Math.PI * hz * t) + 0.3 * Math.sin(4 * Math.PI * hz * t);
        break;
      default:
        env = Math.min(1, t / 0.02) * Math.exp(-t * 3);
        v = Math.sin(2 * Math.PI * hz * t);
    }
    out[s0 + i] += v * env * amp;
  }
}

function addKick(out: Float32Array, sr: number, start: number, amp: number) {
  const s0 = Math.floor(start * sr);
  const len = Math.floor(0.18 * sr);
  for (let i = 0; i < len && s0 + i < out.length; i++) {
    const t = i / sr;
    const f = 110 * Math.exp(-t * 25) + 45;
    out[s0 + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 18) * amp;
  }
}

function addHat(out: Float32Array, sr: number, start: number, amp: number, rand: () => number) {
  const s0 = Math.floor(start * sr);
  const len = Math.floor(0.04 * sr);
  for (let i = 0; i < len && s0 + i < out.length; i++) {
    out[s0 + i] += (rand() * 2 - 1) * Math.exp(-(i / sr) * 90) * amp;
  }
}

function encodeWav(pcm: Buffer, sr: number, meta: Record<string, string>): Buffer {
  const infoParts: Buffer[] = [];
  const tags: Record<string, string> = {
    INAM: meta.title ?? "Húzdrá! mintadal",
    IART: meta.artist ?? "Húzdrá!",
    ICMT: meta.comment ?? "Helykitöltő hang – mock mód",
    ISFT: "huzdra-mock-synth",
  };
  for (const [id, value] of Object.entries(tags)) {
    const data = Buffer.from(`${value}\0`, "utf8");
    const padded = data.length % 2 ? Buffer.concat([data, Buffer.alloc(1)]) : data;
    const head = Buffer.alloc(8);
    head.write(id, 0, "ascii");
    head.writeUInt32LE(data.length, 4);
    infoParts.push(head, padded);
  }
  const info = Buffer.concat([Buffer.from("INFO", "ascii"), ...infoParts]);
  const list = Buffer.alloc(8);
  list.write("LIST", 0, "ascii");
  list.writeUInt32LE(info.length, 4);

  const header = Buffer.alloc(44);
  const total = 36 + pcm.length + 8 + info.length;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(total, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sr, 24);
  header.writeUInt32LE(sr * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm, list, info]);
}
