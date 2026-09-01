import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">TenhaVoz</h1>
      <p className="text-lg text-gray-600">
        Crie uma campanha, escolha um template e mobilize pessoas com um
        clique — cada visitante envia o e-mail pelo próprio app de e-mail
        dele, com a mensagem já pronta.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
        >
          Criar campanha
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-100"
        >
          Entrar
        </Link>
      </div>
      <div className="mt-8 flex gap-4 text-xs text-gray-400">
        <Link href="/privacidade" className="hover:underline">
          Privacidade
        </Link>
        <Link href="/termos" className="hover:underline">
          Termos
        </Link>
      </div>
    </main>
  );
}
