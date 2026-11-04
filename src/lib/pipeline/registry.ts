import "server-only";
import {
  ConsoleEmailAdapter,
  MockLyricsAdapter,
  MockMusicAdapter,
  MockPaymentAdapter,
  MockVoiceAdapter,
  MockWatermarkAdapter,
  RuleModerationAdapter,
} from "./adapters/mock";
import type { Adapters } from "./adapters/types";

const g = globalThis as unknown as { __huzdraAdapters?: Adapters };

/**
 * Szolgáltatók összerakása környezeti változók alapján.
 * 3. fázis: PROVIDER_LLM=anthropic, PROVIDER_MUSIC=..., PROVIDER_VOICE=..., PAYMENT=stripe|barion, EMAIL=resend
 */
export function getAdapters(): Adapters {
  if (!g.__huzdraAdapters) {
    g.__huzdraAdapters = {
      lyrics: new MockLyricsAdapter(),
      music: new MockMusicAdapter(),
      voice: new MockVoiceAdapter(),
      watermark: new MockWatermarkAdapter(),
      moderation: new RuleModerationAdapter(),
      payment: new MockPaymentAdapter(),
      email: new ConsoleEmailAdapter(),
    };
  }
  return g.__huzdraAdapters;
}
