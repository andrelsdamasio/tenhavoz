"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reconsulta a página a cada poucos segundos enquanto o pagamento (Pix)
 * ainda está sendo confirmado, para a página liberar na tela sem a pessoa
 * precisar recarregar. Para sozinho depois de `maxMinutes`.
 */
export default function AutoRefresh({
  intervalSeconds = 15,
  maxMinutes = 10,
}: {
  intervalSeconds?: number;
  maxMinutes?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > maxMinutes * 60 * 1000) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [router, intervalSeconds, maxMinutes]);

  return null;
}
