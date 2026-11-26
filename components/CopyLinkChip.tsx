"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Endereço da página com botão de copiar ao lado. */
export default function CopyLinkChip({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o endereço continua visível
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar o link ${label}`}
      className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-ink/25 bg-paper px-3 py-1 text-xs font-semibold text-ink hover:border-ink"
    >
      <span className="truncate">{label}</span>
      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-folha" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <span className="sr-only" role="status">{copied ? "Link copiado" : ""}</span>
    </button>
  );
}
