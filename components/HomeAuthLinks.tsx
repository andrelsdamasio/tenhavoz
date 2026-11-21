"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Links de conta da página inicial. A página é servida em cache para todo mundo,
 * então a checagem de login acontece no navegador: visitante vê "Entrar", quem
 * está logado vê "Minha conta".
 */
export default function HomeAuthLinks({ variant }: { variant: "header" | "footer" }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      createClient()
        .auth.getUser()
        .then(({ data }) => {
          if (active) setLoggedIn(!!data.user);
        })
        .catch(() => {});
    } catch {
      /* sem sessão: continua como visitante */
    }
    return () => {
      active = false;
    };
  }, []);

  if (variant === "footer") {
    return (
      <Link href={loggedIn ? "/dashboard" : "/login"} className="underline-offset-4 hover:underline">
        {loggedIn ? "Minha conta" : "Entrar"}
      </Link>
    );
  }

  if (loggedIn) {
    return (
      <Link href="/dashboard" className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper hover:bg-brand-600">
        Minha conta
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
        Entrar
      </Link>
      <Link href="/signup" className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper hover:bg-brand-600">
        Criar campanha
      </Link>
    </>
  );
}
