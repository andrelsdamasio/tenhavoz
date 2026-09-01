"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCouponAction, type CreateCouponState } from "./actions";

const initialState: CreateCouponState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar cupom"}
    </button>
  );
}

export default function CouponForm() {
  const [state, formAction] = useFormState(createCouponAction, initialState);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="code">
            Código
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            placeholder="BEMVINDO10"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="maxRedemptions">
            Limite de usos (opcional)
          </label>
          <input
            id="maxRedemptions"
            name="maxRedemptions"
            type="number"
            min="1"
            placeholder="Sem limite"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-gray-600">Tipo de desconto</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="discountType"
              value="percent"
              checked={discountType === "percent"}
              onChange={() => setDiscountType("percent")}
            />
            Porcentagem
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="discountType"
              value="fixed"
              checked={discountType === "fixed"}
              onChange={() => setDiscountType("fixed")}
            />
            Valor fixo (R$)
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="discountValue">
          {discountType === "percent" ? "Percentual de desconto (%)" : "Valor do desconto (R$)"}
        </label>
        <input
          id="discountValue"
          name="discountValue"
          type="number"
          min="1"
          step={discountType === "percent" ? "1" : "0.01"}
          required
          className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="expiresAt">
          Expira em (opcional)
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="date"
          className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Cupom criado.</p>}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
