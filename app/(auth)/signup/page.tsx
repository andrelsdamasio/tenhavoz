"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signUp, type AuthActionState } from "../actions";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const initialState: AuthActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Criando conta..." : "Criar conta"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signUp, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Criar conta</h1>
      <GoogleSignInButton />
      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        ou
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">Mínimo de 8 caracteres.</p>
        </div>
        {state.error && (
          <div className="text-sm text-red-600">
            <p>{state.error}</p>
            <p className="mt-1 text-gray-500">
              Se esse e-mail já tem conta (inclusive via Google), use o botão
              &ldquo;Continuar com Google&rdquo; acima ou{" "}
              <Link href="/login" className="underline">
                entre pela tela de login
              </Link>
              .
            </p>
          </div>
        )}
        <SubmitButton />
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
