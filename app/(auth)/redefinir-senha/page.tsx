"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword, type AuthActionState } from "../actions";

const initial: AuthActionState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-60">
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export default function ResetPasswordPage() {
  const [state, action] = useFormState(updatePassword, initial);
  return (
    <main className="tv-app mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 display text-4xl sm:text-5xl">Nova senha</h1>
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Nova senha (mínimo 8 caracteres)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <Submit />
      </form>
    </main>
  );
}
