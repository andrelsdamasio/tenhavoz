"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createFundraiserAction, type FundraiserFormState } from "@/app/dashboard/doacoes/new/actions";
import { budgetGapCents, DOC_MAX_BYTES, formatCentsBRL, parseBRLToCents, platformFeeCents, safeDocName } from "@/lib/fundraisers";
import { BASIC_COLORS } from "@/lib/color";
import ColorPicker from "@/components/ColorPicker";
import FundraiserView, { FUNDRAISER_THEMES, type FundraiserViewProps } from "@/components/FundraiserView";

const STEPS = ["Receber", "Sua história", "Meta e prazo", "Orçamento", "Aparência", "Revisar"] as const;
const initial: FundraiserFormState = { error: null };

interface Line {
  label: string;
  amount: string;
  description: string;
  fileName: string;
}

const EMPTY_LINE: Line = { label: "", amount: "", description: "", fileName: "" };

/** Bloco estático no lugar do formulário de doação, só para a prévia. */
function PreviewDonate({ color }: { color: string }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      <p className="text-sm font-medium">Quanto você quer doar?</p>
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        {["R$ 20", "R$ 50", "R$ 100", "R$ 200"].map((v) => (
          <span key={v} className="rounded-md border border-gray-300 py-2">{v}</span>
        ))}
      </div>
      <span className="block rounded-md py-2.5 text-center font-semibold text-white" style={{ background: color }}>Doar agora</span>
    </div>
  );
}

/** Mostra a página da campanha reduzida, como na escolha de modelo da campanha de e-mail. */
function Scaled({ width, scale, height, children }: { width: number; scale: number; height: number; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar campanha"}
    </button>
  );
}

const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export default function FundraiserForm({ connected }: { connected: boolean }) {
  const [state, formAction] = useFormState(createFundraiserAction, initial);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const [forWhom, setForWhom] = useState<"me" | "other">("me");
  const [beneficiary, setBeneficiary] = useState("");
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [templateId, setTemplateId] = useState(1);
  const [color, setColor] = useState<string | null>("#4338ca");
  const [showPreview, setShowPreview] = useState(false);

  const goalCents = parseBRLToCents(goal);
  const budget = lines
    .filter((l) => l.label.trim() || l.amount.trim())
    .map((l) => ({ label: l.label.trim(), amountCents: parseBRLToCents(l.amount) ?? 0, description: l.description.trim() }));
  const gap = goalCents ? budgetGapCents(goalCents, budget) : 0;

  async function generateWithAI() {
    setAiError(null);
    if (idea.trim().length < 20) {
      setAiError("Conte um pouco mais (pelo menos uma ou duas frases) para a IA conseguir ajudar.");
      return;
    }
    setAiBusy(true);
    try {
      const context = `${forWhom === "other" && beneficiary ? `A campanha é para ${beneficiary}. ` : ""}${idea}`;
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "fundraiser_fill", text: context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha");
      setTitle(data.result.title);
      setSummary(data.result.summary);
      setStory(data.result.story);
    } catch {
      setAiError("A IA não conseguiu agora. Você pode escrever o texto à mão ou tentar de novo.");
    } finally {
      setAiBusy(false);
    }
  }

  function validateStep(n: number): string | null {
    if (n === 0 && !connected) return "Conecte sua conta do Mercado Pago para continuar.";
    if (n === 1) {
      if (forWhom === "other" && !beneficiary.trim()) return "Diga o nome de quem vai receber a ajuda.";
      if (title.trim().length < 5) return "Dê um título à campanha (mínimo 5 letras).";
      if (story.trim().length < 50) return "Conte a história com pelo menos 50 caracteres.";
    }
    if (n === 2) {
      if (!goalCents || goalCents < 1000) return "Informe a meta em reais (mínimo R$ 10,00).";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    setStepError(err);
    if (!err) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const fee = goalCents ? platformFeeCents(goalCents) : 0;

  const viewProps: FundraiserViewProps = {
    templateId,
    color,
    title: title || "Título da sua campanha",
    beneficiary: forWhom === "other" ? beneficiary || null : null,
    summary: summary || null,
    story: story || "A história da sua campanha aparece aqui. Conte o que aconteceu e por que a ajuda importa.",
    goalCents: goalCents ?? 500000,
    raisedCents: 0,
    donationCount: 0,
    daysLeft: endsAt ? Math.max(0, Math.ceil((new Date(`${endsAt}T23:59:59`).getTime() - Date.now()) / 86_400_000)) : null,
    budget: budget.map((b, i) => ({
      id: String(i),
      label: b.label || "Item do orçamento",
      amount_cents: b.amountCents,
      description: b.description || null,
      attachment_name: lines.filter((l) => l.label.trim() || l.amount.trim())[i]?.fileName || null,
      attachment_url: lines.filter((l) => l.label.trim() || l.amount.trim())[i]?.fileName ? "#" : null,
    })),
    donations: [],
    donateSlot: <PreviewDonate color={color ?? "#1d4ed8"} />,
    notice: "Prévia: assim a página aparece para quem vai doar",
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
    <div className="min-w-0 space-y-4">
    <button
      type="button"
      onClick={() => setShowPreview((v) => !v)}
      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 lg:hidden"
    >
      {showPreview ? "Esconder prévia da página" : "Ver prévia da página"}
    </button>
    {showPreview && (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white lg:hidden">
        <Scaled width={1000} scale={0.34} height={520}>
          <FundraiserView {...viewProps} />
        </Scaled>
      </div>
    )}
    <form action={formAction} noValidate className="space-y-6">
      <ol className="flex gap-2 text-xs sm:text-sm" aria-label="Passos">
        {STEPS.map((name, i) => (
          <li
            key={name}
            aria-current={i === step ? "step" : undefined}
            className={`flex-1 rounded-md px-2 py-1.5 text-center ${i === step ? "bg-brand-600 text-white" : i < step ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}
          >
            {i + 1}. {name}
          </li>
        ))}
      </ol>

      {/* Passo 0: receber o dinheiro */}
      <section hidden={step !== 0} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Onde você vai receber o dinheiro?</h2>
          <p className="mt-1 text-sm text-gray-600">
            As doações caem <strong>direto na sua conta do Mercado Pago</strong>. O dinheiro nunca passa pelo TenhaVoz. Você só precisa autorizar uma vez.
          </p>
          {connected ? (
            <p className="mt-4 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">✓ Sua conta do Mercado Pago está conectada. Pode continuar.</p>
          ) : (
            <>
              <a href="/api/mp/oauth/start?next=nova" className="mt-4 inline-block rounded-md bg-[#009ee3] px-5 py-2.5 font-medium text-white hover:opacity-90">
                Conectar com Mercado Pago
              </a>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-600">
                <li>Você será levado à página oficial do Mercado Pago, onde fará o login e autorizará.</li>
                <li>Depois, volta aqui para criar a campanha. Você pode revogar o acesso quando quiser, no próprio Mercado Pago.</li>
                <li>Não guardamos sua senha. O Mercado Pago libera só o necessário para receber as doações.</li>
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Passo 1 */}
      <section hidden={step !== 1} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Para quem é a ajuda?</legend>
          <div className="flex gap-3">
            {(["me", "other"] as const).map((v) => (
              <label key={v} className={`flex-1 cursor-pointer rounded-md border p-3 text-sm ${forWhom === v ? "border-brand-600 bg-brand-50" : "border-gray-300"}`}>
                <input type="radio" name="forWhom" value={v} checked={forWhom === v} onChange={() => setForWhom(v)} className="mr-2" />
                {v === "me" ? "Para mim ou meu grupo" : "Para outra pessoa ou causa"}
              </label>
            ))}
          </div>
        </fieldset>
        {forWhom === "other" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome de quem vai receber</span>
            <input name="beneficiaryName" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inputCls} maxLength={80} />
          </label>
        )}

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Conte em poucas palavras o que você precisa (a IA escreve o texto)</span>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="Ex.: Queremos levar 30 pessoas de ônibus a Brasília para a audiência pública do dia 20. Precisamos de ônibus, alimentação e hospedagem."
              className={inputCls}
            />
          </label>
          <button
            type="button"
            onClick={generateWithAI}
            disabled={aiBusy}
            className="mt-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-300 hover:bg-brand-100 disabled:opacity-60"
          >
            {aiBusy ? "Escrevendo…" : "✨ Escrever com IA"}
          </button>
          {aiError && <p role="alert" className="mt-2 text-sm text-red-600">{aiError}</p>}
          <p className="mt-2 text-xs text-gray-600">A IA só usa o que você contou. Revise e ajuste antes de seguir.</p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Título</span>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} maxLength={90} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Resumo (aparece nos compartilhamentos)</span>
          <textarea name="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={300} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Sua história</span>
          <textarea name="story" value={story} onChange={(e) => setStory(e.target.value)} rows={9} maxLength={6000} className={inputCls} />
          <span className="text-xs text-gray-500">{story.length}/6000</span>
        </label>
      </section>

      {/* Passo 2 */}
      <section hidden={step !== 2} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Meta (R$)</span>
          <input name="goal" value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" placeholder="5.000,00" className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Até quando? (opcional)</span>
          <input name="endsAt" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          <span className="text-xs text-gray-500">Sem data, a campanha fica aberta até você encerrar.</span>
        </label>
        <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          Você recebe o que for doado, mesmo que não atinja a meta. O dinheiro cai direto na sua conta Mercado Pago.
        </p>
      </section>

      {/* Passo 3 */}
      <section hidden={step !== 3} className="space-y-3">
        <p className="text-sm text-gray-700">Mostre para que o dinheiro será usado. Quem vê o orçamento confia mais e doa mais.</p>
        {lines.map((l, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                name="budgetLabel"
                value={l.label}
                onChange={(e) => setLine(i, { label: e.target.value })}
                placeholder="Ex.: Aluguel do ônibus"
                aria-label={`Item ${i + 1}`}
                className={`${inputCls} flex-1`}
                maxLength={120}
              />
              <input
                name="budgetAmount"
                value={l.amount}
                onChange={(e) => setLine(i, { amount: e.target.value })}
                placeholder="R$ 0,00"
                aria-label={`Valor do item ${i + 1}`}
                inputMode="decimal"
                className={`${inputCls} w-28 sm:w-32`}
              />
              {lines.length > 1 && (
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} aria-label={`Remover item ${i + 1}`} className="px-2 text-gray-500 hover:text-red-600">
                  ✕
                </button>
              )}
            </div>
            <textarea
              name="budgetDescription"
              value={l.description}
              onChange={(e) => setLine(i, { description: e.target.value })}
              rows={2}
              maxLength={300}
              placeholder="Para que será usado? (opcional). Ex.: Ônibus de 44 lugares, saída dia 20 às 6h."
              aria-label={`Explicação do item ${i + 1}`}
              className={inputCls}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">
                📎 {l.fileName ? "Trocar documento" : "Anexar documento"}
                <input
                  type="file"
                  name="budgetFile"
                  accept=".pdf,.xlsx,.xls,.csv,.ods,.doc,.docx,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return setLine(i, { fileName: "" });
                    if (!safeDocName(f.name)) {
                      e.target.value = "";
                      setLine(i, { fileName: "" });
                      return setStepError("Esse tipo de arquivo não é aceito. Envie PDF, planilha, documento ou imagem.");
                    }
                    if (f.size > DOC_MAX_BYTES) {
                      e.target.value = "";
                      setLine(i, { fileName: "" });
                      return setStepError(`"${f.name}" passa de 3 MB. Envie um arquivo menor.`);
                    }
                    setStepError(null);
                    setLine(i, { fileName: f.name });
                  }}
                />
              </label>
              <span className="text-xs text-gray-500">{l.fileName || "Nota fiscal, orçamento, planilha… (PDF, planilha ou imagem, até 3 MB)"}</span>
            </div>
          </div>
        ))}
        {lines.length < 20 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])} className="text-sm font-medium text-brand-700 hover:underline">
            + Adicionar item
          </button>
        )}
        {goalCents && budget.length > 0 && gap !== 0 && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {gap > 0
              ? `Os itens somam ${formatCentsBRL(gap)} a mais que a meta.`
              : `Faltam ${formatCentsBRL(-gap)} no orçamento para chegar à meta.`}{" "}
            Tudo bem, é só um aviso.
          </p>
        )}
      </section>

      {/* Passo 4: aparência */}
      <section hidden={step !== 4} className="space-y-4">
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="themeColor" value={color ?? ""} />
        <div>
          <p className="mb-2 text-sm font-medium">Escolha o modelo da página</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {FUNDRAISER_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                aria-pressed={templateId === t.id}
                className={`relative block overflow-hidden rounded-lg border-2 bg-white text-left transition ${templateId === t.id ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-200 hover:border-gray-300"}`}
              >
                <Scaled width={1000} scale={0.2} height={150}>
                  <FundraiserView {...viewProps} templateId={t.id} />
                </Scaled>
                <span className={`absolute bottom-1.5 right-1.5 rounded px-2 py-0.5 text-xs font-medium ${templateId === t.id ? "bg-brand-600 text-white" : "bg-white/90 text-gray-700 shadow-sm"}`}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Cor da página</p>
          <ColorPicker value={color} onChange={setColor} advanced={false} suggested={BASIC_COLORS.map((c) => c.hex)} />
        </div>
        <p className="text-xs text-gray-500">A prévia mostra como a página fica para quem vai doar (no celular, toque em «Ver prévia da página» lá em cima).</p>
      </section>

      {/* Passo 5 */}
      <section hidden={step !== 5} className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <p className="text-lg font-semibold">{title || "Sem título"}</p>
          {summary && <p className="mt-1 text-gray-600">{summary}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <dt className="text-gray-500">Meta</dt>
            <dd>{goalCents ? formatCentsBRL(goalCents) : "—"}</dd>
            <dt className="text-gray-500">Prazo</dt>
            <dd>{endsAt ? new Date(`${endsAt}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"}</dd>
            <dt className="text-gray-500">Orçamento</dt>
            <dd>{budget.length ? `${budget.length} item(ns)` : "Não informado"}</dd>
          </dl>
        </div>
        <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <strong>Como funciona o custo:</strong> o TenhaVoz fica com 4% de cada doação (
          {goalCents ? `${formatCentsBRL(fee)} se você atingir a meta` : "sobre o valor doado"}), além da tarifa do Mercado Pago. O doador pode, se quiser, deixar uma contribuição voluntária ao TenhaVoz. Não há taxa para abrir a campanha.
        </p>
        <p className="text-xs text-gray-500">Ao salvar, a campanha fica como rascunho. Na próxima tela você confere tudo e clica em publicar.</p>
        {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      </section>

      {stepError && <p role="alert" className="text-sm text-red-600">{stepError}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setStepError(null);
            setStep((s) => Math.max(0, s - 1));
          }}
          className={`text-sm text-gray-600 hover:underline ${step === 0 ? "invisible" : ""}`}
        >
          ← Voltar
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
            Continuar
          </button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
    </div>

    <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
      <p className="mb-2 text-sm font-medium text-gray-700">Prévia da sua página</p>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Scaled width={1000} scale={0.4} height={640}>
          <FundraiserView {...viewProps} />
        </Scaled>
      </div>
    </aside>
    </div>
  );
}
