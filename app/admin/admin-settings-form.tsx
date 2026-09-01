"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateSettingsAction, type UpdateSettingsState } from "./actions";
import type { AppSettings, TemplateId } from "@/lib/types";

const ALL_TEMPLATES: TemplateId[] = [1, 2, 3, 4, 5];

const initialState: UpdateSettingsState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar configurações"}
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
  const [palette, setPalette] = useState<string[]>(settings.template_color_palette);

  function toggleTemplate(id: TemplateId) {
    setEnabledTemplates((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
  }

  function updatePaletteColor(index: number, value: string) {
    setPalette((current) => current.map((color, i) => (i === index ? value : color)));
  }

  function removePaletteColor(index: number) {
    setPalette((current) => current.filter((_, i) => i !== index));
  }

  function addPaletteColor() {
    setPalette((current) => [...current, "#4338ca"]);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="priceReais">
          Preço da campanha (R$)
        </label>
        <input
          id="priceReais"
          name="priceReais"
          type="number"
          min="1"
          step="0.01"
          required
          defaultValue={(settings.campaign_price_brl_cents / 100).toFixed(2)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium" htmlFor="manifestCharLimitEnabled">
          <input
            id="manifestCharLimitEnabled"
            name="manifestCharLimitEnabled"
            type="checkbox"
            defaultChecked={settings.manifest_char_limit_enabled}
          />
          Bloquear criação de campanha acima do limite de caracteres
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="manifestCharLimit"
            name="manifestCharLimit"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={settings.manifest_char_limit}
            className="w-32 rounded-md border border-gray-300 px-3 py-2"
          />
          <span className="text-sm text-gray-600">caracteres no texto do manifesto</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Com o bloqueio ativado, quem tentar criar uma campanha acima desse
          valor não consegue avançar para o pagamento. Desative para permitir
          qualquer tamanho (o aviso de risco de corte no e-mail continua
          aparecendo, mas sem impedir o envio).
        </p>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">
          Templates disponíveis na criação de campanha
        </span>
        <div className="flex gap-4">
          {ALL_TEMPLATES.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="enabledTemplates"
                value={id}
                checked={enabledTemplates.includes(id)}
                onChange={() => toggleTemplate(id)}
              />
              Template {id}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">
          Cores disponíveis para quem cria a campanha
        </span>
        <p className="mb-2 text-xs text-gray-500">
          A pessoa que cria a campanha escolhe uma dessas cores pro template
          que selecionar (ou mantém a cor padrão). Adicione ou remova opções
          aqui.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {palette.map((color, index) => (
            <div key={index} className="flex items-center gap-1">
              <input
                type="color"
                name="paletteColor"
                value={color}
                onChange={(e) => updatePaletteColor(index, e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-gray-300 p-0.5"
              />
              <button
                type="button"
                onClick={() => removePaletteColor(index)}
                className="text-xs text-gray-400 hover:text-red-600"
                aria-label="Remover cor"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPaletteColor}
            className="h-9 rounded-md border border-dashed border-gray-300 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            + Adicionar cor
          </button>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-700">Configurações salvas.</p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
