import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Client com a service role key — bypassa RLS. Uso exclusivo em rotas de
 * webhook (server-side, nunca exposto ao browser), onde precisamos gravar
 * pagamentos e publicar campanhas de qualquer usuário a partir de um evento
 * assíncrono do Stripe/Mercado Pago, sem uma sessão de usuário autenticado.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
