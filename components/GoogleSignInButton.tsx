"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton({ redirectTo }: { redirectTo?: string }) {
  async function signInWithGoogle() {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) callbackUrl.searchParams.set("redirectTo", redirectTo);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
    >
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.7 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l5.9 4.3C13.7 15.6 18.5 12 24 12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.7 6.1 29.1 4 24 4c-7.4 0-13.8 4.1-17.1 10.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5 0 9.6-1.9 13-5.1l-6-4.9c-1.9 1.4-4.4 2.3-7 2.3-5.3 0-9.7-3.3-11.3-7.9l-6 4.8C9.9 39.6 16.4 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6 4.9C40.4 35 44 29.9 44 24c0-1.2-.1-2.4-.4-3.5z"
        />
      </svg>
      Continuar com Google
    </button>
  );
}
