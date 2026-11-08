"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createFundraiserAction, type FundraiserFormState } from "@/app/dashboard/doacoes/new/actions";
import { budgetGapCents, formatCentsBRL, parseBRLToCents, platformFeeCents } from "@/lib/fundraisers";

const STEPS = ["Sua história", "Meta e prazo", "Orçamento", "Revisar"] as const;
const initial: FundraiserFormState = { error: null };

interface Line {
  label: string;
  amount: string;
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

export default function FundraiserForm() {
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
  const [lines, setLines] = useState<Line[]>([{ label: "", amount: "" }]);

  const goalCents = parseBRLToCents(goal);
  const budget = lines
    .filter((l) => l.label.trim() || l.amount.trim())
    .map((l) => ({ label: l.label.trim(), amountCents: parseBRLToCents(l.amount) ?? 0 }));
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
    if (n === 0) {
      if (forWhom === "other" && !beneficiary.trim()) return "Diga o nome de quem vai receber a ajuda.";
      if (title.trim().length < 5) return "Dê um título à campanha (mínimo 5 letras).";
      if (story.trim().length < 50) return "Conte a história com pelo menos 50 caracteres.";
    }
    if (n === 1) {
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

  return (
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

      {/* Passo 1 */}
      <section hidden={step !== 0} className="space-y-4">
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
      <section hidden={step !== 1} className="space-y-4">
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
      <section hidden={step !== 2} className="space-y-3">
        <p className="text-sm text-gray-700">Mostre para que o dinheiro será usado. Quem vê o orçamento confia mais e doa mais.</p>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
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
              className={`${inputCls} w-32`}
            />
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} aria-label={`Remover item ${i + 1}`} className="px-2 text-gray-500 hover:text-red-600">
                ✕
              </button>
            )}
          </div>
        ))}
        {lines.length < 20 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, { label: "", amount: "" }])} className="text-sm font-medium text-brand-700 hover:underline">
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

      {/* Passo 4 */}
      <section hidden={step !== 3} className="space-y-3">
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
        <p className="text-xs text-gray-500">Ao salvar, a campanha fica como rascunho. Para recebê-la no ar você conectará sua conta Mercado Pago.</p>
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
  );
}
