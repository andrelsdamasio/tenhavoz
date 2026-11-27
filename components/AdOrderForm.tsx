"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAdOrderAction, type AdOrderState } from "@/app/anuncie/actions";
import AdSlot from "@/components/AdSlot";
import { AD_IMAGE_HINT } from "@/lib/ad-orders";
import { formatBRL } from "@/lib/pricing";

const initial: AdOrderState = { error: null };
const input = "w-full rounded-md border-2 border-ink/30 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-brand-600 disabled:opacity-60">
      {pending ? "Enviando…" : "Continuar para o pagamento"}
    </button>
  );
}

export default function AdOrderForm({ price7, price30 }: { price7: number; price30: number }) {
  const [state, action] = useFormState(createAdOrderAction, initial);
  const [advertiser, setAdvertiser] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState<"7" | "30">("7");
  const [preview, setPreview] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function onFile(file: File | undefined) {
    setFileError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!file) return setPreview(undefined);
    if (file.size > 1_048_576) {
      setFileError("A imagem passa de 1 MB.");
      return setPreview(undefined);
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Nome do anunciante</span>
          <input name="advertiser" required maxLength={60} value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} className={input} placeholder="Ex.: Padaria Sol" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Título do anúncio <span className="font-normal text-ink-soft">({title.length}/80)</span></span>
          <input name="title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Pão quentinho todo dia" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Texto <span className="font-normal text-ink-soft">({body.length}/200)</span></span>
          <textarea name="body" required maxLength={200} rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={input} placeholder="Conte em poucas palavras o que você oferece." />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Link de destino</span>
          <input name="url" type="url" required maxLength={500} className={input} placeholder="https://seusite.com.br" />
          <span className="text-xs text-ink-soft">Precisa começar com https://. Pode ser seu site, Instagram ou WhatsApp (wa.me).</span>
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-bold">Imagem do anúncio</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed border-ink/50 bg-paper-deep/50 p-4 hover:border-ink">
            <ImagePlus aria-hidden="true" className="h-6 w-6 shrink-0" />
            <span>
              <span className="font-semibold">Escolher imagem</span>
              <span className="block text-xs text-ink-soft">{AD_IMAGE_HINT}</span>
            </span>
            <input name="image" type="file" required accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {fileError && <p role="alert" className="mt-1 text-xs text-red-700">{fileError}</p>}
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Por quanto tempo?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "7", t: "7 dias", p: price7 }, { v: "30", t: "30 dias", p: price30 }].map((o) => (
              <label key={o.v} className={`cursor-pointer rounded-md border-2 p-3 text-sm ${duration === o.v ? "border-ink bg-sol/40" : "border-ink/30 bg-white"}`}>
                <input type="radio" name="duration" value={o.v} checked={duration === o.v} onChange={() => setDuration(o.v as "7" | "30")} className="sr-only" />
                <span className="block font-extrabold">{o.t}</span>
                <span className="display text-2xl">{formatBRL(o.p)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Seu e-mail</span>
          <input name="email" type="email" required autoComplete="email" maxLength={200} className={input} placeholder="voce@empresa.com.br" />
          <span className="text-xs text-ink-soft">Enviamos o recibo e o aviso quando o anúncio for aprovado. Não precisa criar conta.</span>
        </label>
        {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <Submit />
        <p className="text-xs text-ink-soft">
          Todo anúncio é conferido antes de ir ao ar. Se não puder ser publicado, devolvemos o valor integral.
        </p>
      </div>

      <div className="md:sticky md:top-4 md:self-start">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Prévia do seu anúncio</p>
        <AdSlot
          ad={{ advertiser: advertiser || "Seu nome", title: title || "Título do seu anúncio", text: body || "O texto do anúncio aparece aqui.", url: "https://exemplo.com.br", imageUrl: preview }}
        />
        {!preview && <p className="mt-2 text-xs text-ink-soft">Escolha uma imagem para ver como fica.</p>}
      </div>
    </form>
  );
}
