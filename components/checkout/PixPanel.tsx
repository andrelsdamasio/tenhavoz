"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkPixAction, type PixKind } from "@/app/checkout/actions";
import type { PixView } from "@/lib/checkout-pix";

const POLL_MS = 4000;

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Pix na própria página: QR code, copia-e-cola, contagem e confirmação ao vivo. */
export default function PixPanel({
  kind,
  refId,
  pix,
  amountLabel,
  success,
  onRetry,
}: {
  kind: PixKind;
  refId: string;
  pix: PixView;
  amountLabel: string;
  success: { title: string; text: string; href: string; cta: string };
  onRetry?: () => void;
}) {
  const [state, setState] = useState<"waiting" | "paid" | "failed">("waiting");
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(() => new Date(pix.expiresAt).getTime() - Date.now());
  const busy = useRef(false);
  const expired = left <= 0;

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const out = await checkPixAction(kind, pix.paymentId, refId);
      if (out === "approved") setState("paid");
      else if (out === "failed") setState("failed");
    } finally {
      busy.current = false;
    }
  }, [kind, pix.paymentId, refId]);

  useEffect(() => {
    if (state !== "waiting") return;
    const tick = setInterval(() => setLeft(new Date(pix.expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(tick);
  }, [state, pix.expiresAt]);

  useEffect(() => {
    if (state !== "waiting" || expired) return;
    const poll = setInterval(check, POLL_MS);
    return () => clearInterval(poll);
  }, [state, expired, check]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // sem permissão: o código fica visível para copiar à mão
    }
  }

  if (state === "paid") {
    return (
      <div role="status" className="py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-folha text-white">
          <Check aria-hidden="true" className="h-8 w-8" />
        </span>
        <h2 className="display mt-3 text-2xl">{success.title}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{success.text}</p>
        <Link href={success.href} className="mt-4 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          {success.cta}
        </Link>
      </div>
    );
  }

  if (state === "failed" || expired) {
    return (
      <div role="alert" className="py-4 text-center">
        <h2 className="display text-xl">{state === "failed" ? "O pagamento não foi concluído" : "Este Pix venceu"}</h2>
        <p className="mt-1 text-sm text-ink-soft">Nada foi cobrado. Gere um novo Pix quando quiser.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
            Gerar novo Pix
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl">Pague com Pix</h2>
        <span className="display text-2xl">{amountLabel}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[11rem_1fr] sm:items-center">
        {pix.qrCodeBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR code do Pix"
            width={176}
            height={176}
            className="mx-auto h-44 w-44 rounded-md border-2 border-ink bg-white p-1"
          />
        ) : null}
        <ol className="space-y-1.5 text-sm">
          <li><strong>1.</strong> Abra o app do seu banco e escolha <strong>Pix</strong>.</li>
          <li><strong>2.</strong> Leia o QR code ou use o <strong>copia e cola</strong> abaixo.</li>
          <li><strong>3.</strong> Confirme. Esta tela avisa sozinha quando o pagamento cair.</li>
        </ol>
      </div>

      <div className="mt-4">
        <label htmlFor="pix-code" className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-soft">
          Pix copia e cola
        </label>
        <div className="flex gap-2">
          <input id="pix-code" readOnly value={pix.qrCode} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 truncate rounded-md border-2 border-ink/30 bg-paper px-3 py-2 text-xs" />
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-brand-600">
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p role="status" className="sr-only">{copied ? "Código Pix copiado" : ""}</p>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        Aguardando o pagamento · o código vale por {mmss(left)}
      </p>
      <button type="button" onClick={check} className="mt-2 text-xs font-semibold underline underline-offset-4">
        Já paguei, verificar agora
      </button>
    </div>
  );
}
