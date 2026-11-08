"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Algo deu errado</h1>
        <p>Tivemos um problema inesperado.</p>
        <button onClick={reset} style={{ padding: "0.5rem 1rem" }}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
