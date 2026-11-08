import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsBRL, isFundraisingEnabled, listFundraisersForUser } from "@/lib/fundraisers";
import { hasConnection } from "@/lib/mp-oauth";
import { endFundraiserAction, publishFundraiserAction } from "./actions";

const STATUS: Record<string, string> = {
  draft: "Rascunho",
  active: "No ar",
  ended: "Encerrada",
  suspended: "Suspensa",
};

const MP_MESSAGES: Record<string, string> = {
  conectado: "Conta Mercado Pago conectada com sucesso.",
  cancelado: "A conexão foi cancelada. Você pode tentar de novo quando quiser.",
  invalido: "Não foi possível confirmar a conexão. Tente de novo.",
  erro: "Algo deu errado ao conectar. Tente de novo em instantes.",
  indisponivel: "A conexão com o Mercado Pago ainda não está disponível.",
  conecte: "Conecte sua conta Mercado Pago antes de publicar.",
};

export default async function FundraisersPage({ searchParams }: { searchParams: { criada?: string; mp?: string; publicada?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes");
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) notFound();

  const items = await listFundraisersForUser(admin, user.id);
  const connected = await hasConnection(admin, user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Campanhas de arrecadação</h1>
        <Link href="/dashboard/doacoes/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Nova campanha
        </Link>
      </div>
      {searchParams.criada && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Campanha salva como rascunho. Conecte sua conta Mercado Pago abaixo para poder publicar.
        </p>
      )}
      {searchParams.publicada && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">Campanha publicada! Compartilhe o link.</p>
      )}
      {MP_MESSAGES[searchParams.mp ?? ""] && (
        <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{MP_MESSAGES[searchParams.mp ?? ""]}</p>
      )}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">Sua conta Mercado Pago</h2>
        {connected ? (
          <p className="mt-1 text-sm text-green-700">✓ Conectada. As doações caem direto na sua conta.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              O dinheiro das doações cai direto na sua conta Mercado Pago. Você entra no site oficial deles e autoriza; o TenhaVoz nunca vê a sua senha e não guarda o dinheiro.
            </p>
            <a href="/api/mp/oauth/start" className="mt-3 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Conectar com Mercado Pago
            </a>
          </>
        )}
      </section>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
          Você ainda não criou nenhuma campanha de arrecadação.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{f.title}</p>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{STATUS[f.status] ?? f.status}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">Meta: {formatCentsBRL(f.goal_cents)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link href={`/d/${f.slug}`} className="font-medium text-brand-700 hover:underline">
                  {f.status === "draft" ? "Ver prévia" : "Ver página"}
                </Link>
                {f.status === "draft" && (
                  <form action={publishFundraiserAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white hover:bg-gray-700">
                      Publicar
                    </button>
                  </form>
                )}
                {f.status === "active" && (
                  <form action={endFundraiserAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="text-gray-600 hover:underline">Encerrar</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
