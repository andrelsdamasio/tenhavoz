import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getAdminFundraisers } from "@/lib/admin-fundraisers";
import { formatCentsBRL } from "@/lib/fundraisers";
import { setFundraiserStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-200 text-gray-700" },
  active: { label: "No ar", className: "bg-green-100 text-green-800" },
  ended: { label: "Encerrada", className: "bg-gray-200 text-gray-700" },
  suspended: { label: "Suspensa", className: "bg-red-100 text-red-800" },
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border-2 border-ink/80 bg-white p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="display mt-0.5 text-2xl text-gray-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default async function AdminFundraisersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const { ok, erro } = await searchParams;
  const data = await getAdminFundraisers(createAdminClient());

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 display text-4xl sm:text-5xl">Arrecadações</h1>
      <p className="mb-6 text-sm text-gray-600">
        Campanhas de arrecadação, o que já foi arrecadado e a taxa do TenhaVoz. O dinheiro vai direto para a conta de quem criou.
      </p>

      {ok && <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">Alteração feita.</p>}
      {erro && <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não foi possível alterar agora. Tente de novo.</p>}

      {data.stalePending > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {data.stalePending} doação(ões) iniciada(s) há mais de 1 hora sem confirmação. O aviso do Mercado Pago pode ter se
          perdido; confira no painel do Mercado Pago.
        </p>
      )}

      <section aria-label="Números das arrecadações" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="No ar" value={data.active} hint={data.suspended > 0 ? `${data.suspended} suspensa(s)` : undefined} />
        <Stat label="Arrecadado" value={formatCentsBRL(data.raisedCents)} hint={`${data.approvedDonations} doação(ões)`} />
        <Stat label="Taxa do TenhaVoz" value={formatCentsBRL(data.feeCents)} hint="4% de cada doação" />
        <Stat label="Contribuições voluntárias" value={formatCentsBRL(data.tipCents)} hint="Extra dado por quem doou" />
      </section>

      {data.rows.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">Nenhuma campanha de arrecadação ainda.</p>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Lista de arrecadações (rolar para o lado)"
          className="overflow-x-auto rounded-md border border-gray-200 bg-white"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2">Campanha</th>
                <th scope="col" className="px-4 py-2">Criador</th>
                <th scope="col" className="px-4 py-2">Situação</th>
                <th scope="col" className="px-4 py-2">Arrecadado / meta</th>
                <th scope="col" className="px-4 py-2">Doações</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, className: "bg-gray-200 text-gray-700" };
                const canToggle = r.status === "active" || r.status === "suspended";
                return (
                  <tr key={r.id}>
                    <td className="max-w-[16rem] px-4 py-2 [overflow-wrap:anywhere]">
                      <Link href={`/d/${r.slug}`} target="_blank" className="font-semibold text-brand-600 hover:underline">
                        {r.title}
                      </Link>
                      <p className="text-xs text-gray-500">/{r.slug}</p>
                    </td>
                    <td className="px-4 py-2 [overflow-wrap:anywhere]">
                      {r.ownerEmail ?? "—"}
                      {!r.connected && <p className="text-xs text-amber-700">Mercado Pago não conectado</p>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {formatCentsBRL(r.raisedCents)} / {formatCentsBRL(r.goalCents)}
                    </td>
                    <td className="px-4 py-2">{r.donations}</td>
                    <td className="px-4 py-2">
                      {canToggle && (
                        <form action={setFundraiserStatusAction}>
                          <input type="hidden" name="fundraiserId" value={r.id} />
                          <input type="hidden" name="status" value={r.status === "active" ? "suspended" : "active"} />
                          <button
                            type="submit"
                            className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium ${
                              r.status === "active" ? "border-red-300 text-red-700 hover:bg-red-50" : "border-gray-300 text-gray-800 hover:bg-gray-50"
                            }`}
                          >
                            {r.status === "active" ? "Suspender" : "Reativar"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
