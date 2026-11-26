import { redirect } from "next/navigation";
import { BadgePercent, CheckCircle2, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { listCoupons } from "@/lib/coupons";
import { formatBRL } from "@/lib/pricing";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import CouponForm from "./coupon-form";
import CouponsTable, { type CouponRow } from "./CouponsTable";

export default async function CouponsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const coupons = await listCoupons(createAdminClient());
  const now = Date.now();

  const rows: CouponRow[] = coupons.map((c) => {
    const exhausted = c.max_redemptions !== null && c.redemption_count >= c.max_redemptions;
    const expired = c.expires_at ? new Date(c.expires_at).getTime() < now : false;
    return {
      id: c.id,
      code: c.code,
      discount: c.discount_type === "percent" ? `${c.discount_value}%` : formatBRL(c.discount_value),
      uses: c.redemption_count,
      maxUses: c.max_redemptions,
      expiresAt: c.expires_at,
      active: c.active,
      status: !c.active ? "Desativado" : exhausted ? "Esgotado" : expired ? "Expirado" : "Ativo",
    };
  });
  const activeCount = rows.filter((r) => r.status === "Ativo").length;
  const totalUses = rows.reduce((t, r) => t + r.uses, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Cupons de desconto" description="Crie, ative, desative e acompanhe os cupons. Cupons de indicação e de compensação também aparecem aqui." />

      <section aria-label="Resumo dos cupons" className="mb-6 grid grid-cols-3 gap-3">
        <KpiCard label="Cupons" value={rows.length} icon={Ticket} />
        <KpiCard label="Ativos" value={activeCount} icon={CheckCircle2} tone="folha" />
        <KpiCard label="Usos" value={totalUses} icon={BadgePercent} tone="sol" tip="Soma de quantas vezes todos os cupons foram usados." />
      </section>

      <div className="mb-8">
        <CouponForm />
      </div>

      <CouponsTable rows={rows} />
    </div>
  );
}
