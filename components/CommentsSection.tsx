"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  deleteCommentAction,
  editCommentAction,
  postCommentAction,
  reportCommentAction,
  toggleLikeAction,
  type CommentState,
} from "@/app/[slug]/comment-actions";
import { COMMENT_MAX_LENGTH, type PublicComment } from "@/lib/comments";
import { relativeTime } from "@/lib/relative-time";
import { deriveThemeShades, isValidHexColor, themeShadesToCssVars } from "@/lib/color";
import { getCommentTheme, type CommentTheme } from "@/components/comment-themes";
import type { TemplateId } from "@/lib/types";

interface Me {
  loggedIn: boolean;
  isAdmin?: boolean;
  isOwner?: boolean;
  myCommentIds?: string[];
  myLikedIds?: string[];
}

const initial: CommentState = { error: null, posted: false };

const ThemeContext = createContext<CommentTheme>(getCommentTheme(1));
const useTheme = () => useContext(ThemeContext);

const AVATAR_COLORS = ["bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-purple-500"];

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const t = useTheme();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = t.avatarMode === "palette" ? `${AVATAR_COLORS[hash % AVATAR_COLORS.length]} text-white` : t.avatarAccent;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-semibold ${t.avatarShape} ${color} ${
        small ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"
      }`}
    >
      {name.charAt(0).toLocaleUpperCase("pt-BR")}
    </span>
  );
}

function SubmitButton({ label }: { label: string }) {
  const t = useTheme();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-4 py-1.5 text-sm font-medium disabled:opacity-60 ${t.primary}`}
    >
      {pending ? "Publicando..." : label}
    </button>
  );
}

/** Caixa de texto que publica um comentário novo ou uma resposta. */
function Composer({
  campaignId,
  parentId,
  initialText = "",
  placeholder,
  submitLabel,
  autoFocus = false,
  loginHref,
  onDone,
  onCancel,
}: {
  campaignId: string;
  parentId?: string;
  initialText?: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  loginHref: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const [state, formAction] = useFormState(postCommentAction, initial);
  const [body, setBody] = useState(initialText);

  useEffect(() => {
    if (state.needsLogin) {
      router.push(loginHref);
      return;
    }
    if (state.posted) {
      setBody("");
      onDone?.();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="campaignId" value={campaignId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <label htmlFor={`c-${parentId ?? "novo"}`} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={`c-${parentId ?? "novo"}`}
        name="body"
        rows={parentId ? 2 : 3}
        maxLength={COMMENT_MAX_LENGTH}
        value={body}
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm ${t.input}`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`text-xs ${t.counter}`}>
          {body.length}/{COMMENT_MAX_LENGTH}
        </span>
        <span className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className={`text-sm hover:underline ${t.muted}`}>
              Cancelar
            </button>
          )}
          <SubmitButton label={submitLabel} />
        </span>
      </div>
      {state.error && !state.needsLogin && (
        <p role="alert" className={`mt-2 text-sm ${t.danger}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Coração no canto direito, com o número embaixo. Quem decide o login é o servidor. */
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
  sessionKnown: boolean;
  loginHref: string;
}) {
  const t = useTheme();
  const router = useRouter();
  const [state, setState] = useState({ liked, count });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setState({ liked, count }), [liked, count]);

  const label = `${state.count} ${state.count === 1 ? "curtida" : "curtidas"}`;

  function handleClick() {
    const before = state;
    setError(null);
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
      setState({
        liked: result.liked,
        count: Math.max(0, before.count + (result.liked === before.liked ? 0 : result.liked ? 1 : -1)),
      });
    });
  }

  return (
    <div className="flex w-8 shrink-0 flex-col items-center">
      <button
        type="button"
        disabled={pending}
        aria-pressed={state.liked}
        aria-label={`${state.liked ? "Descurtir" : "Curtir"} (${label})`}
        title={error ?? undefined}
        onClick={handleClick}
        className={`rounded-full p-1 transition hover:scale-110 disabled:opacity-60 ${
          state.liked ? t.heartOn : t.heartOff
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={state.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.9 5 6.3 5c2 0 3.3 1.1 4 2.2.3.4.9.4 1.2 0C12.2 6.1 13.5 5 15.5 5c3.4 0 5.3 3.6 3.9 6.8C19.5 16.4 12 21 12 21Z" strokeLinejoin="round" />
        </svg>
      </button>
      {state.count > 0 && <span className={`text-xs ${t.counter}`}>{state.count}</span>}
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}

/** Painel de edição: salvar, compartilhar e excluir ficam todos aqui. */
function EditPanel({
  comment,
  campaignTitle,
  slug,
  loginHref,
  onClose,
}: {
  comment: PublicComment;
  campaignTitle: string;
  slug: string;
  loginHref: string;
  onClose: () => void;
}) {
  const t = useTheme();
  const router = useRouter();
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const link = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`;
  const shareText = `"${body.trim() || comment.body}" — ${comment.author_name}\n\nParticipe da campanha "${campaignTitle}": ${link}`;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await editCommentAction(comment.id, body).catch(() => null);
      if (result?.needsLogin) return void router.push(loginHref);
      if (!result?.ok) return setError(result?.error ?? "Não foi possível salvar agora.");
      onClose();
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const data = new FormData();
      data.set("commentId", comment.id);
      await deleteCommentAction(data).catch(() => null);
      onClose();
      router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <div className={`mt-2 rounded-lg border p-3 ${t.panel}`}>
      <label htmlFor={`edit-${comment.id}`} className="sr-only">
        Editar comentário
      </label>
      <textarea
        id={`edit-${comment.id}`}
        value={body}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(e) => setBody(e.target.value)}
        className={`w-full px-3 py-2 text-sm ${t.input}`}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs ${t.counter}`}>
          {body.length}/{COMMENT_MAX_LENGTH}
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={onClose} className={`text-sm hover:underline ${t.muted}`}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={`px-4 py-1.5 text-sm font-medium disabled:opacity-60 ${t.primary}`}
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </span>
      </div>
      {error && (
        <p role="alert" className={`mt-2 text-sm ${t.danger}`}>
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t [border-top-color:color-mix(in_srgb,currentColor_20%,transparent)] pt-3 text-sm">
        <button type="button" onClick={() => setShareOpen((v) => !v)} aria-expanded={shareOpen} className={`font-medium hover:underline ${t.muted}`}>
          Compartilhar com o link da campanha
        </button>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`font-medium hover:underline ${t.danger}`}>
            Excluir
          </button>
        ) : (
          <span className="flex items-center gap-2 text-xs">
            <span className={t.faint}>Excluir mesmo? As respostas também somem.</span>
            <button type="button" disabled={pending} onClick={remove} className={`font-medium hover:underline ${t.danger}`}>
              Sim, excluir
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={`hover:underline ${t.muted}`}>
              Cancelar
            </button>
          </span>
        )}
      </div>

      {shareOpen && (
        <div className={`mt-3 rounded-md p-3 text-sm ${t.panelInner}`}>
          <p className="mb-2 whitespace-pre-wrap break-words text-xs opacity-80">{shareText}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer noopener"
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${t.outline}`}
            >
              WhatsApp
            </a>
            {canNativeShare && (
              <button
                type="button"
                onClick={() => navigator.share({ text: shareText, url: link }).catch(() => {})}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${t.outline}`}
              >
                Instagram e outros apps
              </button>
            )}
            <button
              type="button"
              onClick={copy}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${t.outline}`}
            >
              {copied ? "Texto copiado!" : "Copiar texto"}
            </button>
          </div>
          {!canNativeShare && (
            <p className={`mt-2 text-xs ${t.faint}`}>
              Para o Instagram, copie o texto e cole nos stories, na bio ou numa conversa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteOthersButton({ commentId }: { commentId: string }) {
  const t = useTheme();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`text-xs font-semibold hover:underline ${t.muted}`}>
        Apagar
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className={t.faint}>Apagar mesmo?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("commentId", commentId);
            await deleteCommentAction(data).catch(() => null);
            router.refresh();
          })
        }
        className={`font-medium hover:underline ${t.danger}`}
      >
        Sim
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={`hover:underline ${t.muted}`}>
        Não
      </button>
    </span>
  );
}

function ReportButton({ commentId }: { commentId: string }) {
  const t = useTheme();
  const [sent, setSent] = useState(false);
  if (sent) return <span className={`text-xs ${t.faint}`}>Denúncia enviada.</span>;
  return (
    <form action={reportCommentAction} onSubmit={() => setSent(true)} className="inline">
      <input type="hidden" name="commentId" value={commentId} />
      <button type="submit" className={`text-xs font-semibold hover:underline ${t.faint}`}>
        Denunciar
      </button>
    </form>
  );
}

function CommentItem({
  comment,
  replies = [],
  isReply = false,
  me,
  now,
  campaignId,
  campaignTitle,
  slug,
  loginHref,
}: {
  comment: PublicComment;
  replies?: PublicComment[];
  isReply?: boolean;
  me: Me | null;
  now: number | null;
  campaignId: string;
  campaignTitle: string;
  slug: string;
  loginHref: string;
}) {
  const t = useTheme();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const mine = me?.myCommentIds?.includes(comment.id) ?? false;
  const canDeleteOthers = !mine && (!!me?.isOwner || !!me?.isAdmin);
  const when =
    now === null
      ? new Date(comment.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : relativeTime(comment.created_at, now);
  // Quem responde a uma resposta continua na mesma conversa, mencionando a pessoa.
  const threadId = isReply ? comment.parent_id! : comment.id;

  return (
    <li className="py-3">
      <div className="flex gap-3">
        <Avatar name={comment.author_name} small={isReply} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className={t.name}>{comment.author_name}</span>{" "}
            <span className={`text-xs ${t.faint}`}>
              {when}
              {comment.edited_at && " · Editado"}
            </span>
          </p>
          <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${t.body}`}>{comment.body}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setReplying((v) => !v)} className={`text-xs font-semibold hover:underline ${t.muted}`}>
              Responder
            </button>
            {mine && (
              <button type="button" onClick={() => setEditing((v) => !v)} className={`text-xs font-semibold hover:underline ${t.muted}`}>
                Editar
              </button>
            )}
            {canDeleteOthers && <DeleteOthersButton commentId={comment.id} />}
            {me?.loggedIn && !mine && <ReportButton commentId={comment.id} />}
          </div>

          {editing && (
            <EditPanel
              comment={comment}
              campaignTitle={campaignTitle}
              slug={slug}
              loginHref={loginHref}
              onClose={() => setEditing(false)}
            />
          )}

          {replying && (
            <div className="mt-3">
              <Composer
                campaignId={campaignId}
                parentId={threadId}
                initialText={`@${comment.author_name} `}
                placeholder={`Responder a ${comment.author_name}`}
                submitLabel="Responder"
                autoFocus
                loginHref={loginHref}
                onDone={() => {
                  setReplying(false);
                  setShowReplies(true);
                }}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowReplies((v) => !v)}
                aria-expanded={showReplies}
                className={`flex items-center gap-2 text-xs font-semibold ${t.muted}`}
              >
                <span aria-hidden="true" className="inline-block h-px w-6 bg-current opacity-30" />
                {showReplies
                  ? "Ocultar respostas"
                  : `Ver ${replies.length === 1 ? "1 resposta" : `mais ${replies.length} respostas`}`}
              </button>
              {showReplies && (
                <ul className="mt-1">
                  {replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      isReply
                      me={me}
                      now={now}
                      campaignId={campaignId}
                      campaignTitle={campaignTitle}
                      slug={slug}
                      loginHref={loginHref}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <LikeButton
          commentId={comment.id}
          count={comment.like_count ?? 0}
          liked={me?.myLikedIds?.includes(comment.id) ?? false}
          sessionKnown={!!me?.loggedIn}
          loginHref={loginHref}
        />
      </div>
    </li>
  );
}

/** Comentários de quem tem conta, no estilo do Instagram. Quem não tem conta só lê. */
export default function CommentsSection({
  campaignId,
  campaignTitle,
  slug,
  comments,
  templateId = 1,
  themeColor = null,
}: {
  campaignId: string;
  campaignTitle: string;
  slug: string;
  comments: PublicComment[];
  templateId?: TemplateId;
  themeColor?: string | null;
}) {
  const theme = getCommentTheme(templateId);
  // Mesmas variáveis de cor que a página usa, para os comentários acompanharem a cor escolhida.
  const colorVars =
    themeColor && isValidHexColor(themeColor)
      ? (themeShadesToCssVars(deriveThemeShades(themeColor)) as React.CSSProperties)
      : undefined;
  const [me, setMe] = useState<Me | null>(null);
  const [now, setNow] = useState<number | null>(null);

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

  // O "há quanto tempo" só é calculado no navegador (evita divergência com o servidor).
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { topLevel, repliesByParent } = useMemo(() => {
    const byParent = new Map<string, PublicComment[]>();
    const top: PublicComment[] = [];
    for (const c of comments) {
      if (c.parent_id) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
      else top.push(c);
    }
    // Principais: mais novos primeiro. Respostas: em ordem de conversa.
    byParent.forEach((list, key) =>
      byParent.set(key, [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)))
    );
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  const loginHref = `/login?redirectTo=${encodeURIComponent(`/${slug}#comentarios`)}`;

  return (
    <ThemeContext.Provider value={theme}>
      <section
        id="comentarios"
        aria-labelledby="comentarios-titulo"
        style={colorVars}
        data-comment-theme={templateId}
        className={theme.section}
      >
        <div className={theme.card}>
          <h2 id="comentarios-titulo" className={theme.title}>
            {theme.titlePrefix}Comentários{" "}
            {comments.length > 0 && <span className={theme.count}>({comments.length})</span>}
          </h2>

          {me?.loggedIn ? (
            <div className="mt-4">
              <Composer
                campaignId={campaignId}
                placeholder="Deixe seu apoio ou sua opinião (sem links)"
                submitLabel="Comentar"
                loginHref={loginHref}
              />
            </div>
          ) : me ? (
            <p className={`mt-4 p-3 text-sm ${theme.prompt}`}>
              <Link href={loginHref} className={`font-medium underline ${theme.promptLink}`}>
                Entre
              </Link>{" "}
              ou{" "}
              <Link href="/signup" className={`font-medium underline ${theme.promptLink}`}>
                crie sua conta
              </Link>{" "}
              para comentar.
            </p>
          ) : null}

          {topLevel.length === 0 ? (
            <p className={`mt-6 text-sm ${theme.faint}`}>Ainda não há comentários. Seja a primeira pessoa a comentar.</p>
          ) : (
            <ul className={`mt-4 divide-y ${theme.divider}`}>
              {topLevel.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  replies={repliesByParent.get(c.id) ?? []}
                  me={me}
                  now={now}
                  campaignId={campaignId}
                  campaignTitle={campaignTitle}
                  slug={slug}
                  loginHref={loginHref}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </ThemeContext.Provider>
  );
}
