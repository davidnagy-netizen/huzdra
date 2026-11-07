import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase mód: ha meg van adva az URL és a service role kulcs, minden adat és fájl a Supabase-ben él. */
export const isSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const g = globalThis as unknown as { __huzdraSb?: SupabaseClient };

/** Szerveroldali admin kliens (service role) – SOHA ne kerüljön a böngészőbe. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabase()) throw new Error("Supabase nincs beállítva (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  if (!g.__huzdraSb) {
    g.__huzdraSb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return g.__huzdraSb;
}
