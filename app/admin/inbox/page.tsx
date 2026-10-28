import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { extractAddress } from "@/lib/inbox";
import { markInboxReadAction } from "./actions";

const TIME_ZONE = "America/Sao_Paulo";
const LIMIT = 100;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TIME_ZONE });
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const { id } = await searchParams;
  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("inbox_messages")
    .select("id, from_address, subject, received_at, read_at, forwarded_at")
    .order("received_at", { ascending: false })
    .limit(LIMIT);

  const list = messages ?? [];
  const selected = id && /^[0-9a-f-]{36}$/i.test(id)
    ? (await admin.from("inbox_messages").select("*").eq("id", id).maybeSingle()).data
    : null;
  const unread = list.filter((m) => !m.read_at).length;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Configurações
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">Caixa de entrada</h1>
      <p className="mb-6 text-sm text-gray-600">
        E-mails recebidos em @tenhavoz.com.br. Cada um também é encaminhado
        para os e-mails de administrador. {unread > 0 ? `${unread} não lido(s).` : "Tudo lido."}
      </p>

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 bg-white text-sm">
          {list.length === 0 && (
            <li className="p-4 text-gray-500">Nenhum e-mail recebido ainda.</li>
          )}
          {list.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/inbox?id=${m.id}`}
                className={`block p-3 hover:bg-gray-50 ${selected?.id === m.id ? "bg-gray-50" : ""}`}
              >
                <p className={`truncate ${m.read_at ? "text-gray-600" : "font-semibold text-gray-900"}`}>
                  {m.subject || "(sem assunto)"}
                </p>
                <p className="truncate text-xs text-gray-500">{m.from_address}</p>
                <p className="text-xs text-gray-400">{formatDateTime(m.received_at)}</p>
              </Link>
            </li>
          ))}
        </ul>

        <section className="rounded-md border border-gray-200 bg-white p-4 text-sm">
          {!selected ? (
            <p className="text-gray-500">Selecione um e-mail para ler.</p>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold">{selected.subject || "(sem assunto)"}</h2>
              <p className="text-xs text-gray-500">
                De {selected.from_address} · para {selected.to_addresses.join(", ")} ·{" "}
                {formatDateTime(selected.received_at)}
              </p>
              {selected.attachments_count > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {selected.attachments_count} anexo(s): veja no painel do Resend.
                </p>
              )}
              {/* Só texto: nunca renderizamos o HTML de um e-mail de terceiros. */}
              <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-gray-800">
                {selected.text_body ?? "(sem texto)"}
              </pre>
              <div className="mt-4 flex items-center gap-4">
                <a
                  href={`mailto:${extractAddress(selected.from_address)}?subject=${encodeURIComponent(
                    `Re: ${selected.subject}`
                  )}`}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Responder
                </a>
                {!selected.read_at && (
                  <form action={markInboxReadAction}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button type="submit" className="text-sm text-gray-600 underline">
                      Marcar como lido
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
