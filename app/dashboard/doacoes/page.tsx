import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsBRL, isFundraisingEnabled, listFundraisersForUser } from "@/lib/fundraisers";

const STATUS: Record<string, string> = {
  draft: "Rascunho",
  active: "No ar",
  ended: "Encerrada",
  suspended: "Suspensa",
};

export default async function FundraisersPage({ searchParams }: { searchParams: { criada?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes");
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) notFound();

  const items = await listFundraisersForUser(admin, user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Campanhas de doação</h1>
        <Link href="/dashboard/doacoes/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Nova campanha
        </Link>
      </div>
      {searchParams.criada && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Campanha salva como rascunho. Em breve você poderá conectar sua conta Mercado Pago e publicar.
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
          Você ainda não criou nenhuma campanha de doação.
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
