"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buildMailtoUrl } from "@/lib/mailto";
import type { SendMode, TemplateId } from "@/lib/types";
import { createCampaignAction, type NewCampaignState } from "@/app/dashboard/new/actions";

const RECOMMENDED_BODY_LIMIT = 1500;

const initialState: NewCampaignState = { error: null };

function parseRecipientsPreview(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar rascunho e ir para pagamento"}
    </button>
  );
}

interface CampaignFormProps {
  enabledTemplates: TemplateId[];
}

export default function CampaignForm({ enabledTemplates }: CampaignFormProps) {
  const [state, formAction] = useFormState(createCampaignAction, initialState);

  const availableTemplates: TemplateId[] =
    enabledTemplates.length > 0 ? enabledTemplates : [1];

  const [subject, setSubject] = useState("");
  const [manifestText, setManifestText] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("bcc");
  const [templateId, setTemplateId] = useState<TemplateId>(availableTemplates[0]!);

  const preview = useMemo(() => {
    const recipients = parseRecipientsPreview(recipientsRaw);
    return buildMailtoUrl({
      recipients,
      sendMode,
      subject,
      body: manifestText,
    });
  }, [recipientsRaw, sendMode, subject, manifestText]);

  const bodyLength = manifestText.length;
  const bodyOverRecommended = bodyLength > RECOMMENDED_BODY_LIMIT;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Título da campanha
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="subject">
          Assunto do e-mail
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label className="block text-sm font-medium" htmlFor="manifestText">
            Texto do manifesto
          </label>
          <span
            className={`text-xs ${bodyOverRecommended ? "text-red-600" : "text-gray-500"}`}
          >
            {bodyLength} / {RECOMMENDED_BODY_LIMIT} caracteres recomendados
          </span>
        </div>
        <textarea
          id="manifestText"
          name="manifestText"
          required
          rows={8}
          value={manifestText}
          onChange={(e) => setManifestText(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {bodyOverRecommended && (
          <p className="mt-1 text-xs text-red-600">
            O corpo passou do limite recomendado de {RECOMMENDED_BODY_LIMIT}{" "}
            caracteres. Alguns clientes de e-mail podem truncar a mensagem —
            considere encurtar o texto.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="recipients">
          E-mails de destino
        </label>
        <textarea
          id="recipients"
          name="recipients"
          required
          rows={4}
          placeholder="um-por-linha@exemplo.com, ou separados por vírgula"
          value={recipientsRaw}
          onChange={(e) => setRecipientsRaw(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          {preview.recipients.length} destinatário(s) reconhecido(s).
        </p>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Modo de envio</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="sendMode"
              value="bcc"
              checked={sendMode === "bcc"}
              onChange={() => setSendMode("bcc")}
            />
            Bcc (cópia oculta)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="sendMode"
              value="to"
              checked={sendMode === "to"}
              onChange={() => setSendMode("to")}
            />
            To (normal)
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="driveLink">
          Link do Google Drive (opcional)
        </label>
        <input
          id="driveLink"
          name="driveLink"
          type="url"
          placeholder="https://drive.google.com/..."
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Exibido como um botão separado na landing page — não entra no corpo
          do e-mail nem consome caracteres do limite do mailto.
        </p>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">
          Template da landing page
        </span>
        <div className="flex gap-3">
          {availableTemplates.map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded-md border px-4 py-2 text-sm ${
                templateId === id
                  ? "border-brand-600 bg-brand-50"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="templateId"
                value={id}
                checked={templateId === id}
                onChange={() => setTemplateId(id)}
                className="sr-only"
              />
              Template {id}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium">
          Pré-visualização do link mailto
        </p>
        <p className="text-xs text-gray-500">
          Tamanho da URL: {preview.length} / {preview.maxLength} caracteres
          {preview.isOverLimit && (
            <span className="ml-2 font-medium text-red-600">
              limite excedido
            </span>
          )}
        </p>
        {preview.warnings.map((warning) => (
          <p key={warning} className="mt-1 text-xs text-amber-700">
            {warning}
          </p>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
