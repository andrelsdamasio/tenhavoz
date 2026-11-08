"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus, flushSync } from "react-dom";
import { buildMailtoUrl } from "@/lib/mailto";
import { sanitizeSlug } from "@/lib/slug";
import { getTemplateComponent } from "@/components/templates";
import { TEMPLATE_NAMES } from "@/lib/template-names";
import ColorPicker from "@/components/ColorPicker";
import { isBasicColor } from "@/lib/color";
import { findInvalidEmails } from "@/lib/email-address";
import type { Campaign, SendMode, TemplateId } from "@/lib/types";
import { createCampaignAction, type NewCampaignState } from "@/app/dashboard/new/actions";
import { updateCampaignAction } from "@/app/dashboard/edit/actions";

const initialState: NewCampaignState = { error: null };

const STEPS = ["Conteúdo", "Destinatários", "Visual", "Revisar"] as const;
const LAST_STEP = STEPS.length - 1;

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
        {TEMPLATE_NAMES[id]}
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
      (editCampaign.drive_link ||
        (editCampaign.theme_color && !isBasicColor(editCampaign.theme_color)) ||
        editCampaign.send_mode !== "bcc")
      ? "avancado"
      : "basico"
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEditing ? LAST_STEP : 0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Sempre reflete o modo atual — usado pra descartar respostas da IA que
  // chegam depois da pessoa já ter trocado de modo.
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // No modo básico, forma de envio e link do Drive ficam no padrão (a cor vem das cores básicas). Os
  // valores escolhidos no avançado continuam guardados no estado (trocar de
  // modo sem querer não apaga nada), mas só valem no avançado — o envio do
  // formulário e a pré-visualização usam estes valores "efetivos".
  const effectiveSendMode: SendMode = mode === "avancado" ? sendMode : "bcc";
  const effectiveDriveLink = mode === "avancado" ? driveLink : "";
  const effectiveThemeColor = themeColor;

  function handleModeChange(next: "basico" | "avancado") {
    if (next === "basico" && title.trim() && subject.trim()) {
      // Título e assunto já existem (possivelmente digitados à mão no
      // avançado): marca o texto atual como "já processado" pra IA do modo
      // básico não sobrescrever o que a pessoa escreveu.
      lastAutoFilledTextRef.current = manifestText.trim();
    }
    setMode(next);
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
    isEditing,
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

  async function fetchAutoFillResult(text: string) {
    const res = await fetch("/api/ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "auto_fill", text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Falha ao usar a IA.");
    return data.result as { title: string; subject: string; subtitle: string };
  }

  // No modo básico, título e assunto vêm de campos ocultos preenchidos pela
  // IA em segundo plano (debounce de 1.5s + chamada à API). Se a pessoa
  // clicar em salvar antes disso terminar (ou se a IA falhar), esses campos
  // ainda estão vazios e o servidor recusaria com um erro genérico que não
  // faz sentido pra quem nunca viu um campo de título/assunto pra preencher.
  // Por isso interceptamos o envio aqui: se faltar título/assunto, geramos
  // na hora e só então deixamos o formulário seguir; se a IA falhar, damos
  // um erro específico em vez do genérico.
  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Enter num campo nos passos anteriores só avança; o envio real é no último.
    if (step < LAST_STEP) {
      e.preventDefault();
      goNext();
      return;
    }
    if (mode === "basico") {
      const trimmed = manifestText.trim();
      if (trimmed && (!title.trim() || !subject.trim())) {
        e.preventDefault();
        if (autoFillDebounceRef.current) clearTimeout(autoFillDebounceRef.current);
        setAiError(null);
        setAiAutoFillLoading(true);
        try {
          const result = await fetchAutoFillResult(trimmed);
          if (!result.title.trim() || !result.subject.trim()) {
            setAiAutoFillLoading(false);
            setAiError(
              "A IA não conseguiu gerar um título e assunto a partir desse texto. Tente detalhar um pouco mais o manifesto, ou mude para o modo avançado para preencher título e assunto você mesmo."
            );
            return;
          }
          flushSync(() => {
            setTitle(result.title);
            setSubject(result.subject);
            setSubtitle(result.subtitle);
          });
          lastAutoFilledTextRef.current = trimmed;
          setAiAutoFillLoading(false);
          formRef.current?.requestSubmit();
        } catch (err) {
          setAiAutoFillLoading(false);
          setAiError(
            `Não conseguimos gerar o título e o assunto automaticamente agora (${
              err instanceof Error ? err.message : "erro desconhecido"
            }). Espere alguns segundos e clique em salvar de novo, ou mude para o modo avançado para preencher título e assunto você mesmo.`
          );
        }
        return;
      }
    }
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
        const result = await fetchAutoFillResult(trimmed);
        // A pessoa pode ter ido pro modo avançado enquanto a IA respondia —
        // nesse caso não sobrescreve o que ela está editando.
        if (modeRef.current !== "basico") return;
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
      sendMode: effectiveSendMode,
      subject,
      body: manifestText,
    });
  }, [recipientsRaw, effectiveSendMode, subject, manifestText]);

  const previewCampaign: Campaign = {
    id: "preview",
    user_id: "preview",
    title: title || "Título da sua campanha",
    subtitle:
      subtitle ||
      (aiAutoFillLoading
        ? "Gerando o resumo com IA..."
        : "O resumo gerado por IA vai aparecer aqui."),
    manifest_text:
      manifestText || "O texto do seu manifesto vai aparecer aqui, no template escolhido.",
    subject: subject || "Assunto do e-mail",
    recipients: preview.recipients,
    send_mode: effectiveSendMode,
    drive_link: effectiveDriveLink || null,
    template_id: templateId,
    theme_color: effectiveThemeColor,
    slug: null,
    status: "draft",
    duration_hours: null,
    expires_at: null,
    expiry_notified_at: null,
    created_at: "1970-01-01T00:00:00.000Z",
  };

  const bodyLength = manifestText.length;
  const bodyOverLimit = bodyLength > manifestCharLimit;
  const bodyOverLimitBlocking = bodyOverLimit && manifestCharLimitEnabled;
  const invalidRecipients = findInvalidEmails(preview.recipients);

  const SelectedTemplate = getTemplateComponent(templateId);

  function validateStep(n: number): string | null {
    if (n === 0) {
      if (!manifestText.trim()) return "Escreva o texto do manifesto para continuar.";
      if (bodyOverLimitBlocking) return "O texto passou do limite. Encurte (ou use \"Encurtar com IA\") para continuar.";
      if (mode === "avancado") {
        if (!title.trim()) return "Preencha o título da campanha.";
        if (!subject.trim()) return "Preencha o assunto do e-mail.";
        if (!slug.trim()) return "Preencha o link curto da página.";
      }
    }
    if (n === 1) {
      if (preview.recipients.length === 0) return "Adicione pelo menos um e-mail de destino.";
      if (invalidRecipients.length > 0) return "Corrija os e-mails em vermelho antes de continuar.";
    }
    return null;
  }

  function goTo(target: number) {
    if (target > step) {
      for (let n = step; n < target; n++) {
        const err = validateStep(n);
        if (err) {
          setStepError(err);
          if (n !== step) setStep(n);
          return;
        }
      }
    }
    setStepError(null);
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    goTo(Math.min(step + 1, LAST_STEP));
  }

  function removeRecipient(email: string) {
    setRecipientsRaw(preview.recipients.filter((r) => r !== email).join(", "));
  }

  const validRecipients = preview.recipients.filter((r) => !invalidRecipients.includes(r));


  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_440px]">
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleFormSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      {isEditing && <input type="hidden" name="campaignId" value={editCampaign.id} />}
      {state.error && (
        <div
          ref={errorRef}
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-medium">Não foi possível continuar:</p>
          <p className="mt-1">{state.error}</p>
          <p className="mt-1 text-xs text-red-600">
            Nada foi perdido — os dados que você digitou continuam preenchidos.
          </p>
        </div>
      )}

      <nav aria-label="Passos da campanha">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const reachable = i <= maxStep;
            const current = i === step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  aria-current={current ? "step" : undefined}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs sm:text-sm transition ${
                    current
                      ? "border-brand-600 bg-brand-50 font-semibold text-brand-700"
                      : reachable
                        ? "border-gray-200 text-gray-700 hover:bg-gray-50"
                        : "border-gray-100 text-gray-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      current ? "bg-brand-600 text-white" : i < step ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {!isEditing && (
          <p className="mt-2 text-xs text-gray-400">Rascunho salvo automaticamente neste navegador.</p>
        )}
      </nav>

      <div hidden={step !== 0} className="flex flex-col gap-6">
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
      </div>

      <div hidden={step !== 1} className="flex flex-col gap-6">
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
          aria-invalid={invalidRecipients.length > 0}
          aria-describedby="recipients-status"
          className={`w-full rounded-md border px-3 py-2 ${
            invalidRecipients.length > 0 ? "border-red-400" : "border-gray-300"
          }`}
        />
        <p id="recipients-status" className="mt-1 text-xs text-gray-500">
          {preview.recipients.length} destinatário(s) reconhecido(s).
        </p>
        {preview.recipients.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Destinatários">
            {preview.recipients.map((email, i) => {
              const bad = invalidRecipients.includes(email);
              return (
                <li
                  key={`${email}-${i}`}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    bad ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    aria-label={`Remover ${email}`}
                    className="ml-1 rounded-full px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {invalidRecipients.length > 0 && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {invalidRecipients.length === 1 ? "Este e-mail parece incorreto" : "Estes e-mails parecem incorretos"}:{" "}
            <strong>{invalidRecipients.join(", ")}</strong>. Confira se não faltou letra no final (ex.:
            .com.br, .gov.br). Com um endereço inválido, o app de e-mail recusa a mensagem para todos.
          </p>
        )}
      </div>
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-6">
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
            ? "Você escolhe o tema e uma das cores básicas. Link do Drive e forma de envio ficam no padrão recomendado."
            : "Escolha qualquer cor por RGB ou código, adicione um link do Drive e defina como os e-mails são enviados."}
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

      <div>
        <span className="mb-1 block text-sm font-medium">
          Cor do tema (opcional)
        </span>
        <input type="hidden" name="themeColor" value={themeColor ?? ""} />
        <ColorPicker
          value={themeColor}
          onChange={setThemeColor}
          advanced={mode === "avancado"}
          suggested={colorPalette}
        />
        <p className="mt-2 text-xs text-gray-500">
          Muda a cor de destaque (botão, acentos) do tema escolhido acima.
        </p>
      </div>
      </div>

      <div hidden={step !== 3} className="flex flex-col gap-6">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">Confira antes de continuar</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Título</dt>
            <dd>{title || "Gerado automaticamente ao salvar"}</dd>
            <dt className="text-gray-500">Assunto</dt>
            <dd>{subject || "Gerado automaticamente ao salvar"}</dd>
            <dt className="text-gray-500">Destinatários</dt>
            <dd>{preview.recipients.length} e-mail(s)</dd>
            <dt className="text-gray-500">Tema</dt>
            <dd>{TEMPLATE_NAMES[templateId]}</dd>
            <dt className="text-gray-500">Link</dt>
            <dd className="break-all">{SITE_HOST}/{slug || "seu-link"}</dd>
          </dl>
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium">Teste antes de publicar</p>
            <p className="mt-1 text-xs text-gray-600">
              Abre o seu app de e-mail com a mensagem montada exatamente como seus apoiadores vão
              ver. Nada é enviado até você apertar enviar lá.
            </p>
            {validRecipients.length > 0 && invalidRecipients.length === 0 ? (
              <a
                href={preview.url}
                className="mt-2 inline-block rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Abrir e-mail de teste
              </a>
            ) : (
              <p className="mt-2 text-xs text-amber-700">
                Corrija os destinatários no passo 2 para liberar o teste.
              </p>
            )}
          </div>
        </section>
      </div>

      {stepError && (
        <p role="alert" className="text-sm text-red-600">
          {stepError}
        </p>
      )}
      {aiError && <p className="text-sm text-red-600">{aiError}</p>}
      {mode === "basico" && aiAutoFillLoading && (
        <p className="text-xs text-gray-500">Gerando título e assunto com IA antes de continuar...</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 lg:hidden"
          >
            {showPreview ? "Esconder prévia" : "Ver prévia"}
          </button>
        </div>
        {step < LAST_STEP ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Continuar
          </button>
        ) : (
          <SubmitButton
            blocked={bodyOverLimitBlocking || aiAutoFillLoading || invalidRecipients.length > 0}
            idleLabel={isEditing ? "Salvar alterações" : "Salvar rascunho e ir para pagamento"}
            pendingLabel="Salvando..."
          />
        )}
      </div>
    </form>

    <aside className={`${showPreview ? "block" : "hidden"} lg:sticky lg:top-6 lg:block`}>
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
