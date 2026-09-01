"use client";

import { useFormState, useFormStatus } from "react-dom";
import { formatBRL } from "@/lib/pricing";
import {
  startStripeCheckout,
  startMercadoPagoCheckout,
  startPixCheckout,
  publishFreeAsAdmin,
  validateCouponAction,
  type ValidateCouponState,
} from "@/app/dashboard/checkout/actions";

const initialCouponState: ValidateCouponState = {
  error: null,
  appliedCode: null,
  discountedPriceCents: null,
};

function ApplyCouponButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? "Aplicando..." : "Aplicar"}
    </button>
  );
}

function PayButton({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "w-full rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      : "w-full rounded-md border border-gray-300 px-4 py-2.5 font-medium hover:bg-gray-100 disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Redirecionando..." : label}
    </button>
  );
}

export default function CouponCheckoutPanel({
  campaignId,
  basePriceCents,
  isAdmin,
}: {
  campaignId: string;
  basePriceCents: number;
  isAdmin: boolean;
}) {
  const [state, formAction] = useFormState(validateCouponAction, initialCouponState);

  const finalPriceCents = state.discountedPriceCents ?? basePriceCents;
  const hasDiscount = state.appliedCode !== null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-600">
        Campanha <strong>{formatBRL(finalPriceCents)}</strong>
        {hasDiscount && (
          <>
            {" "}
            <span className="text-sm text-gray-400 line-through">
              {formatBRL(basePriceCents)}
            </span>{" "}
            <span className="text-sm font-medium text-green-700">
              cupom {state.appliedCode} aplicado
            </span>
          </>
        )}
      </p>

      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="priceCents" value={basePriceCents} />
        <div className="flex-1">
          <label htmlFor="couponCode" className="mb-1 block text-xs font-medium text-gray-600">
            Cupom de desconto (opcional)
          </label>
          <input
            id="couponCode"
            name="couponCode"
            type="text"
            defaultValue={state.appliedCode ?? ""}
            placeholder="CODIGO10"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
        </div>
        <ApplyCouponButton />
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-col gap-3">
        <form action={startPixCheckout}>
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
          <PayButton label="Pagar com Pix" variant="primary" />
        </form>
        <form action={startStripeCheckout}>
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
          <PayButton label="Pagar com Stripe" variant="secondary" />
        </form>
        <form action={startMercadoPagoCheckout}>
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="couponCode" value={state.appliedCode ?? ""} />
          <PayButton label="Pagar com Mercado Pago" variant="secondary" />
        </form>

        {isAdmin && (
          <form action={publishFreeAsAdmin}>
            <input type="hidden" name="campaignId" value={campaignId} />
            <button
              type="submit"
              className="w-full rounded-md border border-dashed border-gray-400 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Publicar sem pagar (admin)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
