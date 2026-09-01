"use client";

import { useFormStatus } from "react-dom";
import { deleteCampaignAction } from "@/app/dashboard/actions";

function ConfirmSubmit({ confirmMessage }: { confirmMessage: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}

export default function DeleteCampaignButton({
  campaignId,
  published,
}: {
  campaignId: string;
  published: boolean;
}) {
  const confirmMessage = published
    ? "Excluir esta campanha? A página pública deixa de existir imediatamente e o link para de funcionar. Essa ação não pode ser desfeita."
    : "Excluir este rascunho de campanha? Essa ação não pode ser desfeita.";

  return (
    <form action={deleteCampaignAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <ConfirmSubmit confirmMessage={confirmMessage} />
    </form>
  );
}
