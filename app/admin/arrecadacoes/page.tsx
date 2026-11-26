import { Gift, HeartHandshake, Landmark, Megaphone } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import FundraisersTable from "./FundraisersTable";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getAdminFundraisers } from "@/lib/admin-fundraisers";
import { formatCentsBRL } from "@/lib/fundraisers";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-200 text-gray-700" },
  active: { label: "No ar", className: "bg-green-100 text-green-800" },
  ended: { label: "Encerrada", className: "bg-gray-200 text-gray-700" },
  suspended: { label: "Suspensa", className: "bg-red-100 text-red-800" },
};

export default async function AdminFundraisersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

    const data = await getAdminFundraisers(createAdminClient());

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Arrecadações" description="Campanhas de arrecadação, o que já foi arrecadado e a taxa do TenhaVoz. O dinheiro vai direto para a conta de quem criou." />

      {data.stalePending > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {data.stalePending} doação(ões) iniciada(s) há mais de 1 hora sem confirmação. O aviso do Mercado Pago pode ter se
          perdido; confira no painel do Mercado Pago.
        </p>
      )}

      <section aria-label="Números das arrecadações" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="No ar" value={data.active} hint={data.suspended > 0 ? `${data.suspended} suspensa(s)` : undefined} icon={Megaphone} tone="folha" />
        <KpiCard label="Arrecadado" value={formatCentsBRL(data.raisedCents)} hint={`${data.approvedDonations} doação(ões)`} icon={HeartHandshake} />
        <KpiCard label="Taxa do TenhaVoz" value={formatCentsBRL(data.feeCents)} hint="4% de cada doação" icon={Landmark} tone="sol" />
        <KpiCard label="Contribuições voluntárias" value={formatCentsBRL(data.tipCents)} hint="Extra dado por quem doou" icon={Gift} tone="brand" />
      </section>

      <FundraisersTable
        rows={data.rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          status: r.status,
          statusLabel: (STATUS[r.status] ?? { label: r.status }).label,
          ownerEmail: r.ownerEmail,
          connected: r.connected,
          raised: formatCentsBRL(r.raisedCents),
          goal: formatCentsBRL(r.goalCents),
          raisedCents: r.raisedCents,
          donations: r.donations,
          createdAt: r.createdAt,
        }))}
      />
    </div>
  );
}
