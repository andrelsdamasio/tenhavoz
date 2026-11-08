"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Guarda por 30 dias a campanha de onde a pessoa veio (?ref=slug), para valer também no login com Google. */
export default function ReferralCapture() {
  const ref = useSearchParams().get("ref");

  useEffect(() => {
    if (ref && /^[a-z0-9][a-z0-9-]{0,99}$/.test(ref)) {
      document.cookie = `tv_ref=${ref}; Max-Age=${30 * 24 * 60 * 60}; Path=/; SameSite=Lax`;
    }
  }, [ref]);

  return null;
}
