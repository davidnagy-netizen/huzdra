// Mock adapterek fejlesztéshez/demóhoz. Valódi szolgáltatót nem hívnak.

import { synthesizeWav } from "../../audio/synth";
import { moderateFields } from "../../moderation";
import { analyzeSupportMessage } from "../support-rules";
import type {
  AudioAdapter,
  AudioJobRequest,
  AudioJobStatus,
  EmailAdapter,
  LyricsAdapter,
  LyricsRequest,
  ModerationAdapter,
  PaymentAdapter,
  SupportAgent,
  SupportAnalysisInput,
  TrainingAdapter,
  TrainingRequest,
  TrainingStatus,
} from "./types";

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function firstSentence(text: string, max = 70): string {
  const s = text.split(/(?<=[.!?])\s+|\n/)[0]?.trim() ?? "";
  return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")}…` : s;
}

const OCCASION_LINES: Record<string, string> = {
  lakodalom: "ma örök hűséget fogad",
  eljegyzes: "kimondta a boldog igent",
  keresztelo: "ma kapja áldását az égtől",
  szuletesnap: "ma újra egy évvel szebb",
  nevnap: "ma a naptár legszebb napja",
  ballagas: "ma búcsút int az iskolának",
  evfordulo: "ma koccint a régi szép időkre",
  "hazassagi-evfordulo": "még most is ugyanúgy táncol vele",
  "anyak-napja": "a család szíve-lelke",
  hazateres: "végre újra itthon van",
  karacsony: "a fa alatt is ragyog",
  szilveszter: "az új évet is velünk kezdi",
  haveroknak: "a társaság legjobb arca",
  egyeb: "ma mindenkinél fontosabb",
};

/**
 * Sablon alapú dalszöveg. Csak a folyamat kipróbálására szolgál – élesben az LLM-adapter
 * (prompts.ts szabályaival) írja a valódi, rímes, helyesen ragozott szöveget.
 */
export class MockLyricsAdapter implements LyricsAdapter {
  readonly name = "mock-lyrics";
  async generate(req: LyricsRequest) {
    const d = req.data;
    const name = d.recipientName.trim();
    const callName = d.nickname.trim() || name;
    const occ = OCCASION_LINES[d.occasionId || "egyeb"] ?? OCCASION_LINES.egyeb;
    const place = d.town.trim() ? `${d.town.trim()} minden utcája` : "Az egész falu";
    const memory = firstSentence(d.memories);
    const joke = d.jokes ? firstSentence(d.jokes, 60) : "";
    const family = d.familyNames ? firstSentence(d.familyNames, 60) : "";
    const saying = d.favoriteSaying ? firstSentence(d.favoriteSaying, 60) : "";
    const duet = req.artist.styles.includes("duett") && req.data.styleId === "duett";
    const years = d.ageOrYears ? `${d.ageOrYears} év` : "";

    const verse1 = [
      "Szóljon a zene, húzza a banda,",
      `${name} ${occ}, ez az ő napja!`,
      `${place} ma erről dalol,`,
      years ? `${years} – és a szíve most is dalol.` : "a szívünk ma érte dobol.",
    ];
    const refrainByMood: Record<string, string[]> = {
      vicces: [
        `Hej, ${callName}, ${callName}, te vagy a buli lelke,`,
        "nélküled a mulatság csak egy csendes hétfő este!",
        "Emeld a poharad, táncoljon a ház,",
        `${callName} kedvéért ma senki nem áll!`,
      ],
      meghato: [
        `${callName}, te vagy nekünk a fény,`,
        "minden rossz napon a remény,",
        "ha szól ez a nóta, gondolj ránk,",
        "a szívünkben örökre itt maradsz már.",
      ],
      unnepelyes: [
        `Éljen ${callName}, éljen sokáig,`,
        "szóljon a hegedű hajnalhasadtáig,",
        "koccintson a család, örüljön a nép,",
        `${callName} ma minden csillagnál szebb!`,
      ],
    };
    const refrain = refrainByMood[d.mood || "unnepelyes"] ?? refrainByMood.unnepelyes;
    const verse2 = [
      memory ? `Emlékszel még? ${memory}` : "Emlékszel még a sok szép napra?",
      joke ? `És ki felejtené el: ${joke}` : "Nevettünk mi annyit, hogy fájt a hasunk,",
      family ? `Itt van ${family}, mind veled ünnepel,` : "Itt van a család, mind veled ünnepel,",
      saying ? `ahogy mondani szoktad: „${saying}”` : "és ez a dal most örökre veled lesz.",
    ];
    const tag = (label: string) => (duet ? `[${label} – Mindketten]` : `[${label}]`);
    const v1Label = duet ? "[1. versszak – 1. hang]" : "[1. versszak]";
    const v2Label = duet ? "[2. versszak – 2. hang]" : "[2. versszak]";
    const extraVerse = d.extras.includes("plusz-versszak")
      ? `\n\n[3. versszak]\nMég egy kört a zenekarnak,\n${name} nevét ma mind dalolják,\nhajnalig szól, ki ne hagyjuk,\nezt a nótát sosem hagyjuk!`
      : "";
    const revisionNote = req.revisionNotes?.length
      ? `\n\n(Mock: a javítási kérést figyelembe vettük – „${req.revisionNotes.at(-1)}”)`
      : "";

    if (req.short) {
      const t = d.mood === "vicces" ? `${callName}, a buli lelke` : d.mood === "meghato" ? `Dal ${name} szívéhez` : `Éljen ${callName}!`;
      return { title: t, text: `${v1Label}\n${verse1.join("\n")}\n\n${tag("Refrén")}\n${refrain.join("\n")}` };
    }
    const text =
      `${v1Label}\n${verse1.join("\n")}\n\n${tag("Refrén")}\n${refrain.join("\n")}\n\n` +
      `${v2Label}\n${verse2.join("\n")}${extraVerse}\n\n${tag("Refrén")}\n${refrain.join("\n")}${revisionNote}`;
    const title = d.mood === "vicces" ? `${callName}, a buli lelke` : d.mood === "meghato" ? `Dal ${name} szívéhez` : `Éljen ${callName}!`;
    return { title, text };
  }
}

/**
 * Mock felvétel: determinisztikus helykitöltő dallam (NEM valódi ének). Élesben a HttpAudioAdapter
 * a zene-API-n keresztül a tanított stílusmodellel és a licencelt hangmodellel generál.
 */
export class MockAudioAdapter implements AudioAdapter {
  readonly name = "mock-audio";
  private jobs = new Map<string, AudioJobRequest>();
  async submit(req: AudioJobRequest) {
    if (!req.voiceModelId) throw new Error("Hiányzó (licencelt) hangmodell-azonosító");
    const jobId = rid("aud");
    this.jobs.set(jobId, req);
    return { jobId };
  }
  async poll(jobId: string): Promise<AudioJobStatus> {
    const req = this.jobs.get(jobId);
    if (!req) return { status: "failed", error: "Ismeretlen feladat (a szerver újraindult?)" };
    this.jobs.delete(jobId);
    const wav = synthesizeWav({
      seed: `${req.refId}:${req.lyrics.length}:${req.watermarkId}`,
      tempo: req.tempo,
      minor: req.mood === "meghato" || req.styleId === "roma-ballada",
      lead: req.instruments.cimbalom ? "cimbalom" : req.styleId === "discos-mulatos" ? "synth" : "violin",
      seconds: req.durationSec,
      metadata: {
        title: req.title,
        artist: req.artistName,
        comment: `Húzdrá! AI-dal (${req.kind}). Watermark: ${req.watermarkId}. Személyes, nem kereskedelmi felhasználásra.`,
      },
    });
    return { status: "done", audio: new Uint8Array(wav), contentType: "audio/wav" };
  }
}

/** Mock tanítás: idővel halad, a végén "modell" azonosítót ad. */
export class MockTrainingAdapter implements TrainingAdapter {
  readonly name = "mock-training";
  async start(req: TrainingRequest) {
    if (!req.samples.length) throw new Error("Nincs kiválasztott zeneminta");
    return { providerJobId: `mocktrain_${Date.now()}_${req.samples.length}_${req.type}` };
  }
  async status(providerJobId: string): Promise<TrainingStatus> {
    const started = Number(providerJobId.split("_")[1] ?? Date.now());
    const secs = (Date.now() - started) / 1000;
    const total = Number(process.env.MOCK_TRAINING_SECONDS ?? 20);
    const voice = providerJobId.endsWith("_voice");
    if (secs >= total) return { status: "succeeded", progress: 100, modelId: `${voice ? "voicemodel" : "stylemodel"}_${providerJobId.split("_")[1]?.slice(-8)}` };
    return { status: secs < 2 ? "queued" : "running", progress: Math.min(99, Math.round((secs / total) * 100)) };
  }
}

/** Szabályalapú szupport-ágens (magyar). Claude API kulcs esetén az AnthropicSupportAgent váltja. */
export class RuleSupportAgent implements SupportAgent {
  readonly name = "rules-support-v1";
  async analyze(input: SupportAnalysisInput) {
    return analyzeSupportMessage(input);
  }
}

export class RuleModerationAdapter implements ModerationAdapter {
  readonly name = "rules-v1";
  async check(fields: Record<string, string>) {
    return moderateFields(fields);
  }
}

export class MockPaymentAdapter implements PaymentAdapter {
  readonly name = "mock-payment";
  async authorize() {
    return { intentId: rid("pi_mock") };
  }
  async capture(intentId: string, amountHuf: number) {
    console.info(`[mock-payment] terhelés: ${intentId} – ${amountHuf} Ft`);
  }
  async cancel(intentId: string) {
    console.info(`[mock-payment] zárolás feloldva: ${intentId}`);
  }
  async refund(intentId: string, amountHuf: number) {
    console.info(`[mock-payment] visszatérítés: ${intentId} – ${amountHuf} Ft`);
  }
}

export class ConsoleEmailAdapter implements EmailAdapter {
  readonly name = "mock-email";
  async send(msg: { to: string; subject: string }) {
    console.info(`[mock-email] → ${msg.to}: ${msg.subject}`);
  }
}
