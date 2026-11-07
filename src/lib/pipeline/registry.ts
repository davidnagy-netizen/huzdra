import "server-only";
import { AnthropicLyricsAdapter, AnthropicSupportAgent } from "./adapters/anthropic";
import { HttpAudioAdapter, HttpTrainingAdapter } from "./adapters/http-music";
import {
  ConsoleEmailAdapter,
  MockAudioAdapter,
  MockLyricsAdapter,
  MockPaymentAdapter,
  MockTrainingAdapter,
  RuleModerationAdapter,
  RuleSupportAgent,
} from "./adapters/mock";
import type { Adapters } from "./adapters/types";

const g = globalThis as unknown as { __huzdraAdapters?: Adapters };

/**
 * Szolgáltatók összerakása környezeti változók alapján:
 *   ANTHROPIC_API_KEY → Claude írja a dalszöveget és érti a szupport-leveleket
 *   MUSIC_API_URL     → külső zene-API: tanítás + generálás (HTTP szerződés: docs/zene-api.md)
 *   (fizetés: Stripe/Barion, e-mail: Resend – a 3. fázisban)
 */
export function getAdapters(): Adapters {
  if (!g.__huzdraAdapters) {
    const llm = !!process.env.ANTHROPIC_API_KEY;
    const music = !!process.env.MUSIC_API_URL;
    g.__huzdraAdapters = {
      lyrics: llm ? new AnthropicLyricsAdapter() : new MockLyricsAdapter(),
      support: llm ? new AnthropicSupportAgent() : new RuleSupportAgent(),
      audio: music ? new HttpAudioAdapter() : new MockAudioAdapter(),
      training: music ? new HttpTrainingAdapter() : new MockTrainingAdapter(),
      moderation: new RuleModerationAdapter(),
      payment: new MockPaymentAdapter(),
      email: new ConsoleEmailAdapter(),
    };
  }
  return g.__huzdraAdapters;
}
