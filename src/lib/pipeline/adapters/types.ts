// Szolgáltató-független adapter interfészek. Minden külső szolgáltatás (LLM, zene + ének,
// tanítás, moderáció, fizetés, e-mail, szupport) e mögé kerül, így cserélhetők.

import type {
  Artist,
  Lyrics,
  ModerationResult,
  Order,
  StyleId,
  SupportExtracted,
  SupportIntent,
  Tempo,
  WizardData,
} from "../../types";

export interface LyricsRequest {
  data: WizardData;
  artist: Artist;
  occasionLabel: string;
  styleLabel: string | null;
  /** Javításkérésnél az ügyfél megjegyzései */
  revisionNotes?: string[];
  previous?: Lyrics | null;
  /** Előnézethez rövidebb szöveg (1 versszak + refrén) */
  short?: boolean;
  /** Előnézetből lett rendelés: ezt a versszakot + refrént meg kell tartani és teljes dallá bővíteni */
  expandFrom?: Lyrics | null;
}

export interface LyricsAdapter {
  readonly name: string;
  generate(req: LyricsRequest): Promise<{ title: string; text: string }>;
}

/** Egy kész felvétel (zene + ének) legenerálása. Aszinkron: beküldés, majd lekérdezés. */
export interface AudioJobRequest {
  kind: "song" | "preview";
  refId: string;
  durationSec: number;
  tempo: Tempo;
  styleId: StyleId | null;
  mood: string;
  instruments: { violin: boolean; cimbalom: boolean };
  lyrics: string;
  /** Csak licencelt / hozzájárulással rendelkező, platformon belüli hangmodell */
  voiceModelId: string;
  /** A tanított stílusmodell (admin → Zenék → tanítás), ha van aktív */
  styleModelId: string | null;
  pronunciationHints: string[];
  /** Vízjelbe/metaadatba kerülő azonosító */
  watermarkId: string;
  title: string;
  artistName: string;
}

export type AudioJobStatus =
  | { status: "pending"; progress?: number }
  | { status: "done"; audio: Uint8Array; contentType: string }
  | { status: "failed"; error: string };

export interface AudioAdapter {
  readonly name: string;
  submit(req: AudioJobRequest): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<AudioJobStatus>;
}

/** Stílusmodell tanítása a feltöltött zenemintákból. */
export interface TrainingRequest {
  jobId: string;
  name: string;
  styleIds: StyleId[];
  samples: {
    id: string;
    url: string;
    title: string;
    bpm: number | null;
    musicalKey: string | null;
    styleIds: string[];
    instruments: string[];
    mood: string;
  }[];
}

export type TrainingStatus =
  | { status: "queued" | "running"; progress: number }
  | { status: "succeeded"; progress: 100; modelId: string }
  | { status: "failed"; progress: number; error: string };

export interface TrainingAdapter {
  readonly name: string;
  start(req: TrainingRequest): Promise<{ providerJobId: string }>;
  status(providerJobId: string): Promise<TrainingStatus>;
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
  refund(intentId: string, amountHuf: number): Promise<void>;
}

export interface EmailAdapter {
  readonly name: string;
  send(msg: { to: string; subject: string; html: string; replyTo?: string }): Promise<void>;
}

/** Szupport-ágens: megérti az ügyfél üzenetét, és javaslatot tesz a műveletre + válaszra. */
export interface SupportAnalysisInput {
  subject: string;
  message: string;
  order: {
    code: string;
    status: string;
    recipientName: string;
    nickname: string;
    pronunciation: string;
    artistName: string;
    revisionsLeft: number;
  } | null;
}

export interface SupportAnalysis {
  intent: SupportIntent;
  confidence: number;
  extracted: SupportExtracted;
  /** Tegező, barátságos magyar válasz-tervezet az ügyfélnek */
  reply: string;
}

export interface SupportAgent {
  readonly name: string;
  analyze(input: SupportAnalysisInput): Promise<SupportAnalysis>;
}

export interface Adapters {
  lyrics: LyricsAdapter;
  audio: AudioAdapter;
  training: TrainingAdapter;
  moderation: ModerationAdapter;
  payment: PaymentAdapter;
  email: EmailAdapter;
  support: SupportAgent;
}

export type { Order };
