"use client";

import { useState, useTransition } from "react";
import PixPanel from "@/components/checkout/PixPanel";
import { startAdCardAction, startAdPixAction } from "@/app/anuncie/actions";
import type { PixView } from "@/lib/checkout-pix";

export default function AdPayment({ adId, amountLabel, cardError }: { adId: string; amountLabel: string; cardError?: boolean }) {
  const [pix, setPix] = useState<PixView | null>(null);
  const [error, setError] = useState<string | null>(cardError ? "Não conseguimos abrir o pagamento por cartão agora. Nada foi cobrado." : null);
  const [attempt, setAttempt] = useState(0);
  const [pending, start] = useTransition();

  function generate(next: number) {
    setError(null);
    start(async () => {
      const r = await startAdPixAction(adId, next);
      setAttempt(next);
      if (r.pix) setPix(r.pix);
      else setError(r.error);
    });
  }

  if (pix) {
    return (
      <PixPanel
        kind="ad"
        refId={adId}
        pix={pix}
        amountLabel={amountLabel}
        success={{ title: "Pagamento confirmado!", text: "Recebemos o seu pagamento. Vamos conferir o anúncio e colocá-lo no ar em até 1 dia útil. Avisamos por e-mail.", href: `/anuncie/pedido/${adId}`, cta: "Ver o meu pedido" }}
        onRetry={() => {
          setPix(null);
          generate(attempt + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="display text-xl">Como você quer pagar?</h2>
      <button type="button" disabled={pending} onClick={() => generate(attempt)} className="w-full rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-brand-600 disabled:opacity-60">
        {pending ? "Gerando o Pix…" : `Pagar ${amountLabel} com Pix`}
      </button>
      <form action={startAdCardAction}>
        <input type="hidden" name="adId" value={adId} />
        <button type="submit" className="w-full rounded-md border-2 border-ink px-4 py-3 font-bold hover:bg-paper-deep">
          Pagar com cartão (tela segura do Mercado Pago)
        </button>
      </form>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
