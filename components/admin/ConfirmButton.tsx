"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRef } from "react";

/**
 * Botão de submit que pede confirmação antes de enviar o formulário em que está.
 * Use nas ações que não dá para desfazer (excluir, suspender).
 */
export default function ConfirmButton({
  label,
  title,
  description,
  confirmLabel = "Confirmar",
  danger = false,
  className = "",
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  className?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button ref={trigger} type="button" className={className}>
          {label}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-ink/50" />
        <AlertDialog.Content className="tv-app fixed left-1/2 top-1/3 z-[61] w-[min(92vw,26rem)] -translate-x-1/2 rounded-md border-2 border-ink bg-paper p-5 shadow-xl">
          <AlertDialog.Title className="display text-2xl">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-ink-soft">{description}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md border-2 border-ink/60 px-3 py-2 text-sm font-bold hover:bg-paper-deep">Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={() => trigger.current?.form?.requestSubmit()}
              className={`rounded-md px-3 py-2 text-sm font-bold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-ink hover:bg-brand-600"}`}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
