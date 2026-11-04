// Szolgáltató-független adapter interfészek. Minden külső szolgáltatás (LLM, zene, hang,
// vízjel, moderáció, fizetés, e-mail) e mögé kerül, így cserélhetők.

import type { Artist, Lyrics, ModerationResult, Order, Tempo, WizardData } from "../../types";

export interface LyricsRequest {
  data: WizardData;
  artist: Artist;
  occasionLabel: string;
  styleLabel: string | null;
  /** Javításkérésnél az ügyfél megjegyzései */
  revisionNotes?: string[];
  previous?: Lyrics | null;
}

export interface LyricsAdapter {
  readonly name: string;
  generate(req: LyricsRequest): Promise<{ title: string; text: string }>;
}

export interface MusicRequest {
  orderId: string;
  tempo: Tempo;
  styleId: string | null;
  mood: string;
  instruments: { violin: boolean; cimbalom: boolean };
  durationSec: number;
}

export interface MusicAdapter {
  readonly name: string;
  /** Zenei alap (instrumentális) előállítása. Visszaad egy belső tárhely-hivatkozást. */
  generateBacking(req: MusicRequest): Promise<{ backingRef: string }>;
}

export interface VoiceRequest {
  orderId: string;
  /** Csak licencelt, platformon belüli hangmodell használható. */
  voiceModelId: string;
  lyrics: string;
  backingRef: string;
  pronunciationHints: string[];
}

export interface VoiceAdapter {
  readonly name: string;
  sing(req: VoiceRequest): Promise<{ mixRef: string }>;
}

export interface WatermarkAdapter {
  readonly name: string;
  /** Hallhatatlan vízjel + metaadat beágyazása. */
  apply(input: { mixRef: string; orderId: string; artistId: string }): Promise<{ url: string; watermarkId: string }>;
}

export interface ModerationAdapter {
  readonly name: string;
  check(fields: Record<string, string>): Promise<ModerationResult>;
}

export interface PaymentAdapter {
  readonly name: string;
  /** Kártya rögzítése / zárolás – terhelés még nincs. */
  authorize(input: { amountHuf: number; email: string; orderCode: string }): Promise<{ intentId: string }>;
  capture(intentId: string, amountHuf: number): Promise<void>;
  cancel(intentId: string): Promise<void>;
}

export interface EmailAdapter {
  readonly name: string;
  send(msg: { to: string; subject: string; html: string }): Promise<void>;
}

export interface Adapters {
  lyrics: LyricsAdapter;
  music: MusicAdapter;
  voice: VoiceAdapter;
  watermark: WatermarkAdapter;
  moderation: ModerationAdapter;
  payment: PaymentAdapter;
  email: EmailAdapter;
}

export type { Order };
