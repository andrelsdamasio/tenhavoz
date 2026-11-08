"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-gray-600">Tivemos um problema inesperado. Tente de novo; se continuar, volte mais tarde.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
          Tentar de novo
        </button>
        <a href="/" className="rounded-lg border px-4 py-2">
          Ir para o início
        </a>
      </div>
    </main>
  );
}
