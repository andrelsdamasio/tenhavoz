"use client";

import { useEffect } from "react";
import { markInboxReadOnOpenAction } from "@/app/admin/inbox/actions";

/** Ao abrir uma mensagem não lida, marca como lida e o selo vermelho do menu some. */
export default function MarkInboxRead({ id }: { id: string }) {
  useEffect(() => {
    void markInboxReadOnOpenAction(id).catch(() => {});
  }, [id]);
  return null;
}
