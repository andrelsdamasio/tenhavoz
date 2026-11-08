import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { listReportedComments } from "@/lib/comments";
import { deleteReportedCommentAction, dismissReportAction } from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function AdminCommentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const reported = await listReportedComments(createAdminClient());

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Comentários denunciados</h1>
      <p className="mb-6 text-sm text-gray-600">
        Comentários que alguém denunciou. Apague os que forem abusivos ou mantenha os que estiverem certos.
      </p>

      {reported.length === 0 ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Nenhum comentário denunciado.
        </p>
      ) : (
        <ul className="space-y-3">
          {reported.map((c) => (
            <li key={c.id} className="rounded-md border border-gray-200 bg-white p-4">
              <p className="text-sm">
                <strong>{c.author_name}</strong>{" "}
                <span className="text-xs text-gray-400">
                  · comentou em {when(c.created_at)}
                  {c.reported_at && ` · denunciado em ${when(c.reported_at)}`}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{c.body}</p>
              <p className="mt-1 text-xs text-gray-500">
                Campanha:{" "}
                {c.campaignSlug ? (
                  <Link href={`/${c.campaignSlug}#comentarios`} target="_blank" className="text-brand-600 hover:underline">
                    {c.campaignTitle ?? c.campaignSlug} ↗
                  </Link>
                ) : (
                  (c.campaignTitle ?? "—")
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={deleteReportedCommentAction}>
                  <input type="hidden" name="commentId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Apagar comentário
                  </button>
                </form>
                <form action={dismissReportAction}>
                  <input type="hidden" name="commentId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Manter (ignorar denúncia)
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
