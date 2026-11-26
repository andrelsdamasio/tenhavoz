"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-60">
      {pending ? "Enviando..." : "Enviar link"}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestPasswordReset, { error: null, sent: false });
  return (
    <main className="tv-app mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 display text-4xl sm:text-5xl">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-gray-600">Informe o e-mail da sua conta e enviamos um link para criar uma nova senha.</p>
      {state.sent ? (
        <p role="status" className="rounded-md border-2 border-ink bg-sol/30 p-3 text-sm">
          Se existir uma conta com esse e-mail, o link já está a caminho. Confira também o spam.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
            <input id="email" name="email" type="email" required maxLength={254} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          <Submit />
        </form>
      )}
      <p className="mt-4 text-sm text-gray-600">
        <Link href="/login" className="text-brand-600 hover:underline">Voltar para entrar</Link>
      </p>
    </main>
  );
}
