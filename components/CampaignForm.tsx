"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buildMailtoUrl } from "@/lib/mailto";
import { sanitizeSlug } from "@/lib/slug";
import { getTemplateComponent } from "@/components/templates";
import type { Campaign, SendMode, TemplateId } from "@/lib/types";
import { createCampaignAction, type NewCampaignState } from "@/app/dashboard/new/actions";
import { updateCampaignAction } from "@/app/dashboard/edit/actions";

const initialState: NewCampaignState = { error: null };

const DRAFT_STORAGE_KEY = "tenhavoz:new-campaign-draft";

interface StoredDraft {
  title: string;
  subtitle: string;
  subject: string;
  manifestText: string;
  recipientsRaw: string;
  sendMode: SendMode;
  driveLink: string;
  templateId: TemplateId;
  themeColor: string | null;
  slug: string;
  slugTouched: boolean;
  mode: "basico" | "avancado";
}

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

function SubmitButton({
  blocked,
  pendingLabel,
  idleLabel,
}: {
  blocked: boolean;
  pendingLabel: string;
  idleLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || blocked}
      className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? pendingLabel : idleLabel}
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
        Tema {id}
      </span>
    </button>
  );
}

interface CampaignFormProps {
  enabledTemplates: TemplateId[];
  manifestCharLimit: number;
  manifestCharLimitEnabled: boolean;
  colorPalette: string[];
  /** Presente = formulário em modo de edição de uma campanha já existente. */
  editCampaign?: Campaign;
}

export default function CampaignForm({
  enabledTemplates,
  manifestCharLimit,
  manifestCharLimitEnabled,
  colorPalette,
  editCampaign,
}: CampaignFormProps) {
  const isEditing = !!editCampaign;
  const [state, formAction] = useFormState(
    isEditing ? updateCampaignAction : createCampaignAction,
    initialState
  );

  const availableTemplates: TemplateId[] =
    enabledTemplates.length > 0 ? enabledTemplates : [1];

  const [title, setTitle] = useState(editCampaign?.title ?? "");
  const [subtitle, setSubtitle] = useState(editCampaign?.subtitle ?? "");
  const [subject, setSubject] = useState(editCampaign?.subject ?? "");
  const [manifestText, setManifestText] = useState(editCampaign?.manifest_text ?? "");
  const [recipientsRaw, setRecipientsRaw] = useState(
    editCampaign?.recipients.join(", ") ?? ""
  );
  const [sendMode, setSendMode] = useState<SendMode>(editCampaign?.send_mode ?? "bcc");
  const [driveLink, setDriveLink] = useState(editCampaign?.drive_link ?? "");
  const [templateId, setTemplateId] = useState<TemplateId>(
    editCampaign?.template_id ?? availableTemplates[0]!
  );
  const [themeColor, setThemeColor] = useState<string | null>(
    editCampaign?.theme_color ?? null
  );
  const [slug, setSlug] = useState(editCampaign?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [aiTitleLoading, setAiTitleLoading] = useState(false);
  const [aiSubtitleLoading, setAiSubtitleLoading] = useState(false);
  const [aiShortenLoading, setAiShortenLoading] = useState(false);
  const [aiAutoFillLoading, setAiAutoFillLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoFillDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoFilledTextRef = useRef<string>(editCampaign?.manifest_text ?? "");
  const [mode, setMode] = useState<"basico" | "avancado">(
    editCampaign &&
      (editCampaign.drive_link || editCampaign.theme_color || editCampaign.send_mode !== "bcc")
      ? "avancado"
      : "basico"
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  function handleModeChange(next: "basico" | "avancado") {
    setMode(next);
    if (next === "basico") {
      setSendMode("bcc");
      setDriveLink("");
      setThemeColor(null);
    }
  }

  // Restaura um rascunho salvo no navegador (ex: a página recarregou por
  // causa de um novo deploy do site enquanto a pessoa ainda estava digitando).
  // Não se aplica ao modo de edição — lá os valores já vêm da campanha real.
  useEffect(() => {
    if (isEditing) {
      setDraftLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft: Partial<StoredDraft> = JSON.parse(raw);
        if (draft.title) setTitle(draft.title);
        if (draft.subtitle) setSubtitle(draft.subtitle);
        if (draft.subject) setSubject(draft.subject);
        if (draft.manifestText) {
          setManifestText(draft.manifestText);
          if (draft.title) lastAutoFilledTextRef.current = draft.manifestText;
        }
        if (draft.recipientsRaw) setRecipientsRaw(draft.recipientsRaw);
        if (draft.sendMode) setSendMode(draft.sendMode);
        if (draft.driveLink) setDriveLink(draft.driveLink);
        if (draft.templateId && availableTemplates.includes(draft.templateId)) {
          setTemplateId(draft.templateId);
        }
        if (draft.themeColor !== undefined) setThemeColor(draft.themeColor);
        if (draft.slug) {
          setSlug(draft.slug);
          setSlugTouched(!!draft.slugTouched);
        }
        if (draft.mode) setMode(draft.mode);
      }
    } catch {
      // localStorage indisponível ou rascunho corrompido — segue com o formulário vazio
    } finally {
      setDraftLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva automaticamente o que a pessoa vai digitando, pra não perder nada
  // se a página recarregar antes de terminar.
  useEffect(() => {
    if (!draftLoaded || isEditing) return;
    try {
      const hasContent = title || subject || manifestText || recipientsRaw || driveLink;
      if (!hasContent) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      const draft: StoredDraft = {
        title,
        subtitle,
        subject,
        manifestText,
        recipientsRaw,
        sendMode,
        driveLink,
        templateId,
        themeColor,
        slug,
        slugTouched,
        mode,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // localStorage indisponível (modo privado, cota excedida) — segue sem salvar
    }
  }, [
    draftLoaded,
    title,
    subtitle,
    subject,
    manifestText,
    recipientsRaw,
    sendMode,
    driveLink,
    templateId,
    themeColor,
    slug,
    slugTouched,
    mode,
  ]);

  function handleFormSubmit() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignora — pior caso é o rascunho reaparecer numa próxima campanha
    }
  }

  useEffect(() => {
    if (!slugTouched) setSlug(sanitizeSlug(title));
  }, [title, slugTouched]);

  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  async function callAiAssist(task: "shorten" | "title") {
    setAiError(null);
    const res = await fetch("/api/ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        task === "shorten"
          ? { task, text: manifestText, targetLength: manifestCharLimit }
          : { task, text: manifestText }
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Falha ao usar a IA.");
    }
    return data.result as string;
  }

  async function handleGenerateTitle() {
    if (!manifestText.trim()) {
      setAiError("Escreva o texto do manifesto antes de gerar o título.");
      return;
    }
    setAiTitleLoading(true);
    try {
      const result = await callAiAssist("title");
      setTitle(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao usar a IA.");
    } finally {
      setAiTitleLoading(false);
    }
  }

  async function handleGenerateSubtitle() {
    if (!manifestText.trim()) {
      setAiError("Escreva o texto do manifesto antes de gerar o subtítulo.");
      return;
    }
    setAiSubtitleLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "auto_fill", text: manifestText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao usar a IA.");
      const result = data.result as { title: string; subject: string; subtitle: string };
      setSubtitle(result.subtitle);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao usar a IA.");
    } finally {
      setAiSubtitleLoading(false);
    }
  }

  // Modo básico: assim que a pessoa termina de digitar o corpo do texto, a
  // IA gera título, assunto e subtítulo sozinha — a pessoa só digita
  // e-mails, corpo do texto e escolhe o tema.
  useEffect(() => {
    if (mode !== "basico") return;
    if (autoFillDebounceRef.current) clearTimeout(autoFillDebounceRef.current);

    const trimmed = manifestText.trim();
    if (trimmed.length < 30 || trimmed === lastAutoFilledTextRef.current) return;

    autoFillDebounceRef.current = setTimeout(async () => {
      setAiAutoFillLoading(true);
      setAiError(null);
      try {
        const res = await fetch("/api/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: "auto_fill", text: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao usar a IA.");
        const result = data.result as { title: string; subject: string; subtitle: string };
        setTitle(result.title);
        setSubject(result.subject);
        setSubtitle(result.subtitle);
        lastAutoFilledTextRef.current = trimmed;
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Falha ao usar a IA.");
      } finally {
        setAiAutoFillLoading(false);
      }
    }, 1500);

    return () => {
      if (autoFillDebounceRef.current) clearTimeout(autoFillDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestText, mode]);

  async function handleShortenText() {
    setAiShortenLoading(true);
    try {
      const result = await callAiAssist("shorten");
      setManifestText(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao usar a IA.");
    } finally {
      setAiShortenLoading(false);
    }
  }

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
    subtitle: subtitle || null,
    manifest_text:
      manifestText || "O texto do seu manifesto vai aparecer aqui, no template escolhido.",
    subject: subject || "Assunto do e-mail",
    recipients: preview.recipients,
    send_mode: sendMode,
    drive_link: driveLink || null,
    template_id: templateId,
    theme_color: themeColor,
    slug: null,
    status: "draft",
    created_at: "1970-01-01T00:00:00.000Z",
  };

  const bodyLength = manifestText.length;
  const bodyOverLimit = bodyLength > manifestCharLimit;
  const bodyOverLimitBlocking = bodyOverLimit && manifestCharLimitEnabled;

  const SelectedTemplate = getTemplateComponent(templateId);

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_440px]">
    <form action={formAction} onSubmit={handleFormSubmit} className="flex flex-col gap-6">
      {isEditing && <input type="hidden" name="campaignId" value={editCampaign.id} />}
      {state.error && (
        <div
          ref={errorRef}
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-medium">Não foi possível continuar:</p>
          <p className="mt-1">{state.error}</p>
          <p className="mt-1 text-xs text-red-600">
            Nada foi perdido — os dados que você digitou continuam preenchidos abaixo.
          </p>
        </div>
      )}

      {!isEditing && (
        <p className="text-xs text-gray-400">
          Rascunho salvo automaticamente neste navegador.
        </p>
      )}

      {mode === "avancado" && (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="block text-sm font-medium" htmlFor="title">
              Título da campanha
            </label>
            <button
              type="button"
              onClick={handleGenerateTitle}
              disabled={aiTitleLoading}
              className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-60"
            >
              {aiTitleLoading ? "Gerando..." : "Gerar título com IA"}
            </button>
          </div>
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
      )}
      {mode === "basico" && <input type="hidden" name="title" value={title} />}

      {mode === "avancado" && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="slug">
            Link curto da página
          </label>
          <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-1 focus-within:ring-brand-500">
            <span className="whitespace-nowrap pl-3 text-sm text-gray-400">
              {SITE_HOST}/
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
            {isEditing && editCampaign.status === "published"
              ? "Mudar esse endereço muda o link da página que já está no ar — links antigos param de funcionar."
              : "Fica ativo assim que o pagamento for confirmado. Se esse endereço já estiver em uso, adicionamos um código curto automaticamente."}
          </p>
        </div>
      )}
      {mode === "basico" && <input type="hidden" name="slug" value={slug} />}

      {mode === "avancado" && (
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
      )}
      {mode === "basico" && <input type="hidden" name="subject" value={subject} />}

      {mode === "avancado" && (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="block text-sm font-medium" htmlFor="subtitle">
              Subtítulo (resumo curto abaixo do título)
            </label>
            <button
              type="button"
              onClick={handleGenerateSubtitle}
              disabled={aiSubtitleLoading}
              className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-60"
            >
              {aiSubtitleLoading ? "Gerando..." : "Gerar subtítulo com IA"}
            </button>
          </div>
          <textarea
            id="subtitle"
            name="subtitle"
            rows={3}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Resumo de até 5 linhas — aparece no lugar do texto completo do manifesto, abaixo do título."
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      )}
      {mode === "basico" && <input type="hidden" name="subtitle" value={subtitle} />}

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label className="block text-sm font-medium" htmlFor="manifestText">
            Texto do manifesto
          </label>
          <span
            className={`text-xs ${bodyOverLimit ? (bodyOverLimitBlocking ? "text-red-600" : "text-amber-700") : "text-gray-500"}`}
          >
            {bodyLength} / {manifestCharLimit} caracteres
            {manifestCharLimitEnabled ? "" : " (recomendado)"}
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
        {bodyOverLimit && (
          <div className="mt-1 flex items-start justify-between gap-3">
            <p className={`text-xs ${bodyOverLimitBlocking ? "text-red-600" : "text-amber-700"}`}>
              {bodyOverLimitBlocking
                ? "Passou do limite — não é possível avançar para o pagamento até encurtar o texto (ou usar \"Encurtar com IA\")."
                : "Passou do recomendado — o botão de envio continua funcionando normalmente, mas alguns apps de e-mail podem cortar o final da mensagem. Encurte se quiser eliminar esse risco."}
            </p>
            <button
              type="button"
              onClick={handleShortenText}
              disabled={aiShortenLoading}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-brand-600 hover:underline disabled:opacity-60"
            >
              {aiShortenLoading ? "Encurtando..." : "Encurtar com IA"}
            </button>
          </div>
        )}
        {mode === "basico" && (
          <p className="mt-1 text-xs text-gray-500">
            {aiAutoFillLoading
              ? "Gerando título, assunto e subtítulo automaticamente com IA..."
              : title
                ? "Título, assunto e subtítulo já gerados por IA — veja na pré-visualização. Mude para o modo avançado se quiser editar."
                : "Assim que você terminar de escrever, a IA gera o título, o assunto e o subtítulo automaticamente."}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="recipients">
          E-mails de destino
        </label>
        <p className="mb-1 text-xs text-gray-500">
          Digite os e-mails separados por vírgula (nome@exemplo.com,
          outro@exemplo.com) ou um por linha.
        </p>
        <textarea
          id="recipients"
          name="recipients"
          required
          rows={4}
          placeholder="nome@exemplo.com, outro@exemplo.com"
          value={recipientsRaw}
          onChange={(e) => setRecipientsRaw(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          {preview.recipients.length} destinatário(s) reconhecido(s).
        </p>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Personalização</span>
        <div className="inline-flex rounded-md border border-gray-300 p-0.5">
          <button
            type="button"
            onClick={() => handleModeChange("basico")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              mode === "basico" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Modo básico
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("avancado")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              mode === "avancado" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Modo avançado
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {mode === "basico"
            ? "Você só escolhe o tema da página. Cor, link do Drive e forma de envio ficam no padrão recomendado."
            : "Escolha a cor do tema, adicione um link do Drive e defina como os e-mails são enviados."}
        </p>
      </div>

      {mode === "avancado" && (
        <div>
          <span className="mb-1 block text-sm font-medium">Forma de envio</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sendMode"
                value="bcc"
                checked={sendMode === "bcc"}
                onChange={() => setSendMode("bcc")}
              />
              Cópia oculta (ninguém vê os outros e-mails)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sendMode"
                value="to"
                checked={sendMode === "to"}
                onChange={() => setSendMode("to")}
              />
              Cópia visível (todos veem a lista de e-mails)
            </label>
          </div>
        </div>
      )}

      {mode === "avancado" && (
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
            Exibido como um botão separado na landing page — não entra no
            corpo do e-mail nem consome caracteres do limite do link de
            e-mail.
          </p>
        </div>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium">
          Tema da página
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

      {mode === "avancado" && (
        <div>
          <span className="mb-1 block text-sm font-medium">
            Cor do tema (opcional)
          </span>
          <input type="hidden" name="themeColor" value={themeColor ?? ""} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setThemeColor(null)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-xs text-gray-400 ${
                themeColor === null ? "border-brand-600" : "border-gray-200 hover:border-gray-300"
              }`}
              aria-label="Cor padrão do tema"
              title="Cor padrão"
            >
              ✕
            </button>
            {colorPalette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setThemeColor(color)}
                className={`h-9 w-9 rounded-full border-2 ${
                  themeColor === color ? "border-brand-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Usar a cor ${color}`}
                title={color}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Muda a cor de destaque (botão, acentos) do tema escolhido acima.
          </p>
        </div>
      )}

      {mode === "basico" && (
        <input type="hidden" name="themeColor" value="" />
      )}

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium">
          Pré-visualização do link de e-mail
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

      {aiError && <p className="text-sm text-red-600">{aiError}</p>}

      <SubmitButton
        blocked={bodyOverLimitBlocking}
        idleLabel={isEditing ? "Salvar alterações" : "Salvar rascunho e ir para pagamento"}
        pendingLabel="Salvando..."
      />
    </form>

    <aside className="lg:sticky lg:top-6">
      <p className="mb-2 text-sm font-medium text-gray-700">
        Pré-visualização ao vivo
      </p>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="ml-2 truncate text-xs text-gray-500">
            {SITE_HOST}/{slug || "seu-link"}
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="pointer-events-none">
            <SelectedTemplate campaign={previewCampaign} mailtoUrl={preview.url} />
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        É assim que a página vai aparecer para quem receber o link — role para
        ver o resto do conteúdo. Os botões ficam desativados aqui: eles só
        funcionam de verdade depois que a campanha é paga e publicada.
      </p>
    </aside>
    </div>
  );
}
