import "server-only";
import { MockRepository } from "./mock-repository";
import type { Repository } from "./repository";

const g = globalThis as unknown as { __huzdraRepo?: Repository };

/** Az aktuális adattár. Később: HUZDRA_MOCK=0 esetén SupabaseRepository. */
export function getRepo(): Repository {
  if (!g.__huzdraRepo) {
    g.__huzdraRepo = new MockRepository(process.env.DATA_DIR ?? ".data");
  }
  return g.__huzdraRepo;
}

export type { Repository };
