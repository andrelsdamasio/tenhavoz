"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Toaster, toast } from "sonner";

const MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  ok: { tone: "success", text: "Alteração feita." },
  enviado: { tone: "success", text: "E-mail enviado." },
};

function Reader() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const clear: string[] = [];
    for (const [key, msg] of Object.entries(MESSAGES)) {
      if (params.get(key)) {
        (msg.tone === "success" ? toast.success : toast.error)(msg.text);
        clear.push(key);
      }
    }
    const erro = params.get("erro");
    if (erro) {
      toast.error(erro === "1" ? "Não foi possível fazer a alteração agora. Tente de novo." : erro.slice(0, 200));
      clear.push("erro");
    }
    if (clear.length > 0) {
      const next = new URLSearchParams(params.toString());
      clear.forEach((k) => next.delete(k));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  return null;
}

/** Avisos flutuantes (Sonner) para os parâmetros ?ok=, ?erro= e ?enviado= que as ações do admin devolvem. */
export default function ParamToaster() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { border: "2px solid #16120f" } }} />
      <Suspense fallback={null}>
        <Reader />
      </Suspense>
    </>
  );
}
