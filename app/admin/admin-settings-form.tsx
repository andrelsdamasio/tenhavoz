"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateSettingsAction, type UpdateSettingsState } from "./actions";
import type { AppSettings, TemplateId } from "@/lib/types";

const ALL_TEMPLATES: TemplateId[] = [1, 2, 3];

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

  function toggleTemplate(id: TemplateId) {
    setEnabledTemplates((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
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
