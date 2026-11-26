"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateSettingsAction, type UpdateSettingsState } from "./actions";
import type { AppSettings, TemplateId } from "@/lib/types";
import SettingsSection, { settingsInput } from "@/components/SettingsSection";
import { ALL_TEMPLATE_IDS, TEMPLATE_NAMES } from "@/lib/template-names";


const initialState: UpdateSettingsState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-5 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar preços e criação"}
    </button>
  );
}

export default function AdminSettingsForm({
  settings,
}: {
  settings: Omit<AppSettings, "id" | "updated_at">;
}) {
  const [state, formAction] = useFormState(updateSettingsAction, initialState);
  const [enabledTemplates, setEnabledTemplates] = useState<TemplateId[]>(
    settings.enabled_templates
  );

  function toggleTemplate(id: TemplateId) {
    setEnabledTemplates((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
  }

  const reais = (cents: number) => (cents / 100).toFixed(2);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <SettingsSection
        id="precos"
        title="Preços"
        description="Quem cria a campanha escolhe um dos dois prazos no pagamento. A página fica no ar até o prazo acabar. Vale só para novas campanhas."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="price72hReais">
            72 horas (R$)
            <input id="price72hReais" name="price72hReais" type="number" min="0" step="0.01" required defaultValue={reais(settings.price_72h_brl_cents)} className={settingsInput} />
          </label>
          <label className="block text-sm font-semibold" htmlFor="price7dReais">
            7 dias (R$)
            <input id="price7dReais" name="price7dReais" type="number" min="0" step="0.01" required defaultValue={reais(settings.price_7d_brl_cents)} className={settingsInput} />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection
        id="criacao"
        title="Criação de campanhas"
        description="Limite do texto e temas oferecidos no formulário. As cores são livres: o modo básico traz as comuns e o avançado aceita qualquer cor."
      >
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="manifestCharLimitEnabled">
            <input id="manifestCharLimitEnabled" name="manifestCharLimitEnabled" type="checkbox" defaultChecked={settings.manifest_char_limit_enabled} />
            Bloquear criação acima do limite de caracteres
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input id="manifestCharLimit" name="manifestCharLimit" type="number" min="1" step="1" required defaultValue={settings.manifest_char_limit} className="w-32 rounded-md border-2 border-ink/70 bg-white px-3 py-2 text-sm" />
            <span className="text-sm text-ink-soft">caracteres no texto do manifesto</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Desligado, qualquer tamanho é aceito (o aviso de risco de corte no e-mail continua aparecendo).
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Temas disponíveis ({enabledTemplates.length} de {ALL_TEMPLATE_IDS.length})</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_TEMPLATE_IDS.map((id) => {
              const on = enabledTemplates.includes(id);
              return (
                <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-sm ${on ? "border-ink bg-sol/20" : "border-ink/25"}`}>
                  <input type="checkbox" name="enabledTemplates" value={id} checked={on} onChange={() => toggleTemplate(id)} />
                  <span className="font-semibold">Tema {id}</span> · {TEMPLATE_NAMES[id]}
                </label>
              );
            })}
          </div>
        </fieldset>

      </SettingsSection>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-md border-2 border-ink bg-paper p-3 shadow-md">
        <SubmitButton />
        {state.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
        {state.success && <p role="status" className="text-sm font-semibold text-folha">Configurações salvas.</p>}
        <span className="text-xs text-ink-soft">Salva preços e criação.</span>
      </div>
    </form>
  );
}
