"use client";

import { useEffect } from "react";

/**
 * Dispara uma contagem de "view" quando a landing pública é aberta.
 * Roda no client de propósito: a página usa ISR (revalidate = 60s), então
 * contar no server só contaria uma vez por atualização de cache, não por
 * visitante real.
 */
export default function ViewTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    const payload = JSON.stringify({ campaignId, type: "view" });
    navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return null;
}
