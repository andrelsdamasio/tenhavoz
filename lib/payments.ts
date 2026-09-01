import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PaymentProvider, PaymentStatus } from "@/lib/types";

export interface RecordPaymentInput {
  userId: string;
  campaignId: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  couponCode?: string | null;
}

/**
 * Grava o pagamento de forma idempotente. Stripe e Mercado Pago podem
 * reenviar o mesmo evento de webhook mais de uma vez — o upsert com
 * (provider, provider_payment_id) único evita duplicar a linha.
 */
export async function recordPayment(
  admin: SupabaseClient<Database>,
  input: RecordPaymentInput
) {
  const { error } = await admin.from("payments").upsert(
    {
      user_id: input.userId,
      campaign_id: input.campaignId,
      provider: input.provider,
      provider_payment_id: input.providerPaymentId,
      status: input.status,
      amount: input.amount,
      coupon_code: input.couponCode ?? null,
    },
    { onConflict: "provider,provider_payment_id" }
  );

  if (error) throw error;
}
