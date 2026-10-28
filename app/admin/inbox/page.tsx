import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { extractAddress } from "@/lib/inbox";
import { markInboxReadAction, sendInboxEmailAction } from "./actions";

const TIME_ZONE = "America/Sao_Paulo";
const LIMIT = 100;
const UUID = /^[0-9a-f-]{36}$/i;

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: TIME_ZONE });

interface SearchParams {
  id?: string;
  box?: string;
  compose?: string;
  enviado?: string;
  erro?: string;
}

function Banner({ enviado, erro }: { enviado?: string; erro?: string }) {
  if (erro) {
    return (
      <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {erro.slice(0, 200)}
      </p>
    );
  }
  if (enviado) {
    return (
      <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        E-mail enviado.
      </p>
    );
  }
  return null;
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const { id, box: boxRaw, compose, enviado, erro } = await searchParams;
  const box: "in" | "out" = boxRaw === "out" ? "out" : "in";
  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("inbox_messages")
    .select("id, from_address, to_addresses, subject, received_at, read_at, direction")
    .eq("direction", box)
    .order("received_at", { ascending: false })
    .limit(LIMIT);
  const list = messages ?? [];

  const selected = id && UUID.test(id)
    ? (await admin.from("inbox_messages").select("*").eq("id", id).maybeSingle()).data
    : null;

  // Conversa: a mensagem e as respostas enviadas a ela (ou, se for uma resposta, a original).
  let thread: NonNullable<typeof selected>[] = [];
  if (selected) {
    const rootId = selected.reply_to_id ?? selected.id;
    const { data } = await admin
      .from("inbox_messages")
      .select("*")
      .or(`id.eq.${rootId},reply_to_id.eq.${rootId}`)
      .order("received_at", { ascending: true });
    thread = data ?? [];
  }
  const original = thread.find((m) => m.direction === "in") ?? selected;

  const unread = list.filter((m) => box === "in" && !m.read_at).length;
  const tab = (value: "in" | "out", label: string) => (
    <Link
      href={`/admin/inbox?box=${value}`}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        box === value ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Caixa de entrada</h1>
          <p className="text-sm text-gray-600">
            E-mails de @tenhavoz.com.br. Cada recebido também é encaminhado aos e-mails de administrador.
            {box === "in" && (unread > 0 ? ` ${unread} não lido(s).` : " Tudo lido.")}
          </p>
        </div>
        <Link
          href="/admin/inbox?compose=1"
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nova mensagem
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {tab("in", "Recebidos")}
        {tab("out", "Enviados")}
      </div>

      <Banner enviado={enviado} erro={erro} />

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 bg-white text-sm">
          {list.length === 0 && (
            <li className="p-4 text-gray-500">
              {box === "in" ? "Nenhum e-mail recebido ainda." : "Nada enviado ainda."}
            </li>
          )}
          {list.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/inbox?box=${box}&id=${m.id}`}
                className={`block p-3 hover:bg-gray-50 ${selected?.id === m.id ? "bg-gray-50" : ""}`}
              >
                <p className={`truncate ${m.read_at ? "text-gray-600" : "font-semibold text-gray-900"}`}>
                  {m.subject || "(sem assunto)"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {box === "in" ? m.from_address : `Para ${m.to_addresses.join(", ")}`}
                </p>
                <p className="text-xs text-gray-400">{when(m.received_at)}</p>
              </Link>
            </li>
          ))}
        </ul>

        <section className="min-w-0 rounded-md border border-gray-200 bg-white p-4 text-sm">
          {compose ? (
            <form action={sendInboxEmailAction} className="space-y-3">
              <h2 className="text-lg font-semibold">Nova mensagem</h2>
              <label className="block">
                <span className="text-xs text-gray-500">Para</span>
                <input name="to" type="email" required maxLength={254} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Assunto</span>
                <input name="subject" required maxLength={200} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Mensagem</span>
                <textarea name="body" required rows={8} maxLength={20000} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </label>
              <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                Enviar
              </button>
            </form>
          ) : !selected || !original ? (
            <p className="text-gray-500">Selecione um e-mail para ler ou clique em &quot;Nova mensagem&quot;.</p>
          ) : (
            <>
              <h2 className="mb-3 text-lg font-semibold">{original.subject || "(sem assunto)"}</h2>
              <div className="space-y-4">
                {thread.map((m) => (
                  <article
                    key={m.id}
                    className={`rounded-md border p-3 ${
                      m.direction === "out" ? "border-brand-200 bg-brand-50/40" : "border-gray-200"
                    }`}
                  >
                    <p className="text-xs text-gray-500">
                      {m.direction === "out" ? `Você → ${m.to_addresses.join(", ")}` : `De ${m.from_address}`} ·{" "}
                      {when(m.received_at)}
                    </p>
                    {m.attachments_count > 0 && (
                      <p className="mt-1 text-xs text-amber-700">
                        {m.attachments_count} anexo(s): veja no painel do Resend.
                      </p>
                    )}
                    {/* Só texto: nunca renderizamos o HTML de um e-mail de terceiros. */}
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-gray-800">
                      {m.text_body ?? "(sem texto)"}
                    </pre>
                  </article>
                ))}
              </div>

              {original.direction === "in" && (
                <form action={sendInboxEmailAction} className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  <h3 className="font-medium">Responder</h3>
                  <input type="hidden" name="replyToId" value={original.id} />
                  <input type="hidden" name="to" value={extractAddress(original.from_address)} />
                  <input
                    type="hidden"
                    name="subject"
                    value={/^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`}
                  />
                  <p className="text-xs text-gray-500">Para {extractAddress(original.from_address)}</p>
                  <textarea
                    name="body"
                    required
                    rows={6}
                    maxLength={20000}
                    placeholder="Escreva sua resposta..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <div className="flex items-center gap-4">
                    <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                      Enviar resposta
                    </button>
                    {!original.read_at && (
                      <button formAction={markInboxReadAction} formNoValidate name="id" value={original.id} className="text-sm text-gray-600 underline">
                        Marcar como lido
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
