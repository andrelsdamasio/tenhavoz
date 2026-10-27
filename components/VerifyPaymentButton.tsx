"use client";

import { useFormStatus } from "react-dom";
import { verifyPaymentAction } from "@/app/dashboard/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-brand-600 hover:underline disabled:opacity-60"
    >
      {pending ? "Verificando..." : "Já paguei — verificar pagamento"}
    </button>
  );
}

export default function VerifyPaymentButton({ campaignId }: { campaignId: string }) {
  return (
    <form action={verifyPaymentAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <SubmitButton />
    </form>
  );
}
