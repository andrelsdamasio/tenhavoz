"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buildMailtoUrl } from "@/lib/mailto";
import { sanitizeSlug } from "@/lib/slug";
import { getTemplateComponent } from "@/components/templates";
import type { Campaign, SendMode, TemplateId } from "@/lib/types";
import { createCampaignAction, type NewCampaignState } from "@/app/dashboard/new/actions";

const RECOMMENDED_BODY_LIMIT = 1500;

const initialState: NewCampaignState = { error: null };

const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br").replace(
  /^https?:\/\//,
  ""
);

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

function TemplatePreviewCard({
  id,
  campaign,
  mailtoUrl,
  selected,
  onSelect,
}: {
  id: TemplateId;
  campaign: Campaign;
  mailtoUrl: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const Template = getTemplateComponent(id);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative block h-44 w-full overflow-hidden rounded-lg border-2 bg-white text-left transition ${
        selected ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: "1400px", transform: "scale(0.22)" }}
      >
        <Template campaign={campaign} mailtoUrl={mailtoUrl} />
      </div>
      <span
        className={`absolute bottom-1.5 right-1.5 rounded px-2 py-0.5 text-xs font-medium ${
          selected ? "bg-brand-600 text-white" : "bg-white/90 text-gray-700 shadow-sm"
        }`}
      >
        Template {id}
      </span>
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

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [manifestText, setManifestText] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("bcc");
  const [driveLink, setDriveLink] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>(availableTemplates[0]!);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(sanitizeSlug(title));
  }, [title, slugTouched]);

  const preview = useMemo(() => {
    const recipients = parseRecipientsPreview(recipientsRaw);
    return buildMailtoUrl({
      recipients,
      sendMode,
      subject,
      body: manifestText,
    });
  }, [recipientsRaw, sendMode, subject, manifestText]);

  const previewCampaign: Campaign = {
    id: "preview",
    user_id: "preview",
    title: title || "Título da sua campanha",
    manifest_text:
      manifestText || "O texto do seu manifesto vai aparecer aqui, no template escolhido.",
    subject: subject || "Assunto do e-mail",
    recipients: preview.recipients,
    send_mode: sendMode,
    drive_link: driveLink || null,
    template_id: templateId,
    slug: null,
    status: "draft",
    created_at: new Date().toISOString(),
  };

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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="slug">
          Link curto da página
        </label>
        <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-1 focus-within:ring-brand-500">
          <span className="whitespace-nowrap pl-3 text-sm text-gray-400">
            {SITE_HOST}/p/
          </span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(sanitizeSlug(e.target.value));
            }}
            className="w-full rounded-md py-2 pr-3 text-sm outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Fica ativo assim que o pagamento for confirmado. Se esse endereço já
          estiver em uso, adicionamos um código curto automaticamente.
        </p>
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
            className={`text-xs ${bodyOverRecommended ? "text-amber-700" : "text-gray-500"}`}
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
          <p className="mt-1 text-xs text-amber-700">
            Passou do recomendado — o botão de envio continua funcionando
            normalmente, mas alguns apps de e-mail podem cortar o final da
            mensagem. Encurte se quiser eliminar esse risco.
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
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
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
        <input type="hidden" name="templateId" value={templateId} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {availableTemplates.map((id) => (
            <TemplatePreviewCard
              key={id}
              id={id}
              campaign={{ ...previewCampaign, template_id: id }}
              mailtoUrl={preview.url}
              selected={templateId === id}
              onSelect={() => setTemplateId(id)}
            />
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
            <span className="ml-2 font-medium text-amber-700">
              acima do recomendado
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
