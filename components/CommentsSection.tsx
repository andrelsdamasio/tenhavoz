"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  deleteCommentAction,
  postCommentAction,
  reportCommentAction,
  toggleLikeAction,
  type CommentState,
} from "@/app/[slug]/comment-actions";
import { COMMENT_MAX_LENGTH, type PublicComment } from "@/lib/comments";

interface Me {
  loggedIn: boolean;
  isAdmin?: boolean;
  isOwner?: boolean;
  myCommentIds?: string[];
  myLikedIds?: string[];
}

const initial: CommentState = { error: null, posted: false };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
    >
      {pending ? "Publicando..." : "Comentar"}
    </button>
  );
}

function DeleteButton({ commentId, label }: { commentId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs text-gray-500 hover:underline">
        {label}
      </button>
    );
  }
  return (
    <form action={deleteCommentAction} className="inline-flex items-center gap-2 text-xs">
      <input type="hidden" name="commentId" value={commentId} />
      <span className="text-gray-600">Apagar mesmo?</span>
      <button type="submit" className="font-medium text-red-600 hover:underline">
        Sim, apagar
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-gray-500 hover:underline">
        Cancelar
      </button>
    </form>
  );
}

function LikeButton({
  commentId,
  count,
  liked,
  sessionKnown,
  loginHref,
}: {
  commentId: string;
  count: number;
  liked: boolean;
  /** A checagem de sessão do navegador já respondeu e a pessoa está logada. */
  sessionKnown: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState({ liked, count });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setState({ liked, count }), [liked, count]);

  const label = `${state.count} ${state.count === 1 ? "curtida" : "curtidas"}`;

  // Sempre um botão: quem decide se a pessoa está logada é o servidor, no clique.
  // (Antes dependia da checagem do navegador, que demora alguns segundos e
  // mandava gente já logada para a tela de login.)
  function handleClick() {
    const before = state;
    setError(null);
    // Resposta imediata só quando já sabemos que a pessoa está logada.
    if (sessionKnown) {
      setState({ liked: !before.liked, count: Math.max(0, before.count + (before.liked ? -1 : 1)) });
    }
    startTransition(async () => {
      const result = await toggleLikeAction(commentId).catch(() => null);
      if (result?.needsLogin) {
        setState(before);
        router.push(loginHref);
        return;
      }
      if (!result?.ok) {
        setState(before);
        setError(result?.error ?? "Não foi possível curtir agora.");
        return;
      }
      setState({ liked: result.liked, count: Math.max(0, before.count + (result.liked === before.liked ? 0 : result.liked ? 1 : -1)) });
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-pressed={state.liked}
        aria-label={`${state.liked ? "Descurtir" : "Curtir"} (${label})`}
        onClick={handleClick}
        className={`text-xs hover:underline disabled:opacity-60 ${state.liked ? "font-medium text-red-600" : "text-gray-500"}`}
      >
        <span aria-hidden="true">{state.liked ? "♥" : "♡"}</span> {state.count > 0 ? state.count : "Curtir"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}

function ReportButton({ commentId }: { commentId: string }) {
  const [sent, setSent] = useState(false);
  if (sent) return <span className="text-xs text-gray-500">Denúncia enviada. Obrigado.</span>;
  return (
    <form action={reportCommentAction} onSubmit={() => setSent(true)} className="inline">
      <input type="hidden" name="commentId" value={commentId} />
      <button type="submit" className="text-xs text-gray-400 hover:underline">
        Denunciar
      </button>
    </form>
  );
}

/** Comentários de quem tem conta, abaixo do manifesto. Quem não tem conta só lê. */
export default function CommentsSection({
  campaignId,
  slug,
  comments,
}: {
  campaignId: string;
  slug: string;
  comments: PublicComment[];
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [state, formAction] = useFormState(postCommentAction, initial);
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/comments/me?campaignId=${encodeURIComponent(campaignId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { loggedIn: false }))
      .then((data: Me) => active && setMe(data))
      .catch(() => active && setMe({ loggedIn: false }));
    return () => {
      active = false;
    };
  }, [campaignId, comments.length]);

  useEffect(() => {
    if (state.posted) {
      setBody("");
      router.refresh();
    }
  }, [state, router]);

  const loginHref = `/login?redirectTo=${encodeURIComponent(`/${slug}#comentarios`)}`;
  const signupHref = "/signup";

  return (
    <section id="comentarios" aria-labelledby="comentarios-titulo" className="bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 id="comentarios-titulo" className="text-lg font-semibold text-gray-900">
          Comentários {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
        </h2>

        {me?.loggedIn ? (
          <form ref={formRef} action={formAction} className="mt-4">
            <input type="hidden" name="campaignId" value={campaignId} />
            <label htmlFor="comment-body" className="sr-only">
              Seu comentário
            </label>
            <textarea
              id="comment-body"
              name="body"
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Deixe seu apoio ou sua opinião (sem links)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {body.length}/{COMMENT_MAX_LENGTH}
              </span>
              <SubmitButton />
            </div>
            {state.error && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {state.error}
              </p>
            )}
          </form>
        ) : me ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            <Link href={loginHref} className="font-medium text-gray-900 underline">
              Entre
            </Link>{" "}
            ou{" "}
            <Link href={signupHref} className="font-medium text-gray-900 underline">
              crie sua conta
            </Link>{" "}
            para comentar.
          </p>
        ) : null}

        {comments.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">Ainda não há comentários. Seja a primeira pessoa a comentar.</p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100">
            {comments.map((c) => {
              const mine = me?.myCommentIds?.includes(c.id) ?? false;
              const canDelete = mine || !!me?.isOwner || !!me?.isAdmin;
              return (
                <li key={c.id} className="py-4">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900">{c.author_name}</span>{" "}
                    <span className="text-xs text-gray-400">· {formatDate(c.created_at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{c.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <LikeButton
                      commentId={c.id}
                      count={c.like_count ?? 0}
                      liked={me?.myLikedIds?.includes(c.id) ?? false}
                      sessionKnown={!!me?.loggedIn}
                      loginHref={loginHref}
                    />
                    {canDelete && <DeleteButton commentId={c.id} label={mine ? "Apagar o meu" : "Apagar"} />}
                    {me?.loggedIn && !mine && <ReportButton commentId={c.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
