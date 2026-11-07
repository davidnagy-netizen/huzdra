import "server-only";
import { isSupabase } from "../supabase";
import { MockRepository } from "./mock-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

const g = globalThis as unknown as { __huzdraRepo?: Repository };

/** Az aktuális adattár: Supabase, ha be van állítva (SUPABASE_URL + SERVICE_ROLE_KEY), különben helyi JSON. */
export function getRepo(): Repository {
  if (!g.__huzdraRepo) {
    g.__huzdraRepo = isSupabase() ? new SupabaseRepository() : new MockRepository(process.env.DATA_DIR ?? ".data");
  }
  return g.__huzdraRepo;
}

export type { Repository };
