"use client";

import { useState } from "react";

interface CopyFallbackButtonsProps {
  subject: string;
  recipients: string[];
  manifestText: string;
  sendMode: "bcc" | "to";
  className?: string;
}

type FieldKey = "recipients" | "subject" | "body";

/**
 * Fallback manual para quando o botão mailto trunca ou falha (limite de
 * caracteres do cliente de e-mail, apps que não registram o handler
 * mailto:, etc.): mostra o conteúdo real em caixas de texto (não só um
 * botão escondido) para dar transparência e permitir selecionar/copiar
 * manualmente mesmo se a API de clipboard falhar. Padrão validado em
 * campanhas reais do cliente antes do TenhaVoz (ver referências
 * sites.google.com/view/semlimite e /view/mobilizagoias).
 */
export default function CopyFallbackButtons({
  subject,
  recipients,
  manifestText,
  sendMode,
  className,
}: CopyFallbackButtonsProps) {
  const [copied, setCopied] = useState<FieldKey | null>(null);

  async function copy(text: string, which: FieldKey) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Sem permissão de clipboard — o campo continua selecionável manualmente.
    }
  }

  const recipientsText = recipients.join(", ");

  return (
    <div className={className}>
      <p className="mb-3 text-sm font-medium text-gray-700">
        Caso o botão não funcione
      </p>

      <div className="flex flex-col gap-3">
        <Field
          label={`E-mails (${sendMode === "bcc" ? "cópia oculta" : "destinatários"})`}
          value={recipientsText}
          rows={2}
          copied={copied === "recipients"}
          onCopy={() => copy(recipientsText, "recipients")}
        />
        <Field
          label="Assunto"
          value={subject}
          rows={2}
          copied={copied === "subject"}
          onCopy={() => copy(subject, "subject")}
        />
        <Field
          label="Corpo do e-mail"
          value={manifestText}
          rows={5}
          copied={copied === "body"}
          onCopy={() => copy(manifestText, "body")}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  rows,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  rows: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <textarea
        readOnly
        rows={rows}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
      />
      <button
        type="button"
        onClick={onCopy}
        className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
