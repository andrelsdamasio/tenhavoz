"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { donateAction, type DonateState } from "@/app/d/[slug]/donate-actions";
import { formatCentsBRL, parseBRLToCents } from "@/lib/fundraisers";
import { computeCharge, DONATION_MIN_CENTS } from "@/lib/donations";

const QUICK = [2000, 5000, 10000, 20000];
const TIPS = [0, 3, 5, 10];
const initial: DonateState = { error: null, checkoutUrl: null };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md px-4 py-3 font-semibold disabled:opacity-60"
      style={{ background: "var(--tc-base)", color: "var(--tc-on)" }}
    >
      {pending ? "Abrindo o pagamento…" : label}
    </button>
  );
}

export default function DonateForm({ slug }: { slug: string }) {
  const [state, action] = useFormState(donateAction.bind(null, slug), initial);
  const [amount, setAmount] = useState("50,00");
  const [tipPct, setTipPct] = useState(0);

  useEffect(() => {
    if (state.checkoutUrl) window.location.assign(state.checkoutUrl);
  }, [state.checkoutUrl]);

  const cents = parseBRLToCents(amount);
  const valid = cents !== null && cents >= DONATION_MIN_CENTS;
  const tipCents = valid ? Math.round((cents * tipPct) / 100) : 0;
  const charge = valid ? computeCharge(cents, tipCents) : null;
  const tipStr = (tipCents / 100).toFixed(2).replace(".", ",");

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={action} noValidate className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium">Quanto você quer doar?</p>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount((q / 100).toFixed(2).replace(".", ","))}
              className={`rounded-md border px-2 py-1.5 text-sm ${cents === q ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300"}`}
            >
              R$ {q / 100}
            </button>
          ))}
        </div>
        <input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Valor da doação em reais" className={inputCls} />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Contribuição voluntária ao TenhaVoz</p>
        <div className="grid grid-cols-4 gap-2">
          {TIPS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipPct(t)}
              className={`rounded-md border px-2 py-1.5 text-sm ${tipPct === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300"}`}
            >
              {t === 0 ? "Não" : `${t}%`}
            </button>
          ))}
        </div>
        <input type="hidden" name="tip" value={tipStr} />
        <p className="mt-1 text-xs text-gray-500">Totalmente opcional: é um extra, além da doação, só para quem quiser ajudar a manter o TenhaVoz no ar. Não sai do valor da campanha.</p>
      </div>

      <input name="donorName" placeholder="Seu nome (opcional)" maxLength={60} className={inputCls} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" /> Doar como anônimo
      </label>
      <textarea name="message" rows={2} maxLength={300} placeholder="Mensagem de apoio (opcional, sem links)" className={inputCls} />

      {charge && (
        <div className="space-y-1 text-xs text-gray-600">
          <p>
            Você paga <strong>{formatCentsBRL(charge.totalCents)}</strong>. A campanha recebe o valor da doação menos a tarifa
            do Mercado Pago (processamento do pagamento) e a taxa de 4% do TenhaVoz.
          </p>
          <p>
            Os 4% cobrem os custos de manter a plataforma: hospedagem, segurança e prevenção de fraudes, moderação das
            campanhas, suporte e envio dos e-mails de aviso e recibo. Não cobramos nada para abrir a campanha.
          </p>
        </div>
      )}
      {state.error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      <Submit label={charge ? `Doar ${formatCentsBRL(charge.totalCents)}` : "Doar agora"} />
    </form>
  );
}
