import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Client anônimo, sem dependência de cookies/sessão — usado na landing page
 * pública (app/p/[slug]) para não tirar a rota do cache do ISR (ler
 * cookies() marcaria a rota como dinâmica). RLS restringe a leitura a
 * campanhas com status = 'published'.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
