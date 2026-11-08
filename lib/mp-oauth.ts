import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const AUTH_URL = "https://auth.mercadopago.com.br/authorization";
const TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const STATE_TTL_MS = 15 * 60 * 1000;
/** Renova o token quando faltar menos que isso para vencer. */
const REFRESH_MARGIN_MS = 14 * 86_400_000;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tenhavoz.com.br";
export const MP_REDIRECT_URI = `${SITE_URL}/api/mp/oauth/callback`;

function stateSecret(): string {
  const s = process.env.MP_CLIENT_SECRET;
  if (!s) throw new Error("MP_CLIENT_SECRET não configurada.");
  return s;
}

/** `state` do OAuth: amarra a volta do Mercado Pago à pessoa que iniciou a conexão. */
export function signState(userId: string, now: number = Date.now(), secret: string = stateSecret()): string {
  const payload = `${userId}.${now}`;
  const mac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyState(
  state: string,
  userId: string,
  now: number = Date.now(),
  secret: string = stateSecret()
): boolean {
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [uid, ts, mac] = parts as [string, string, string];
  if (uid !== userId) return false;
  const issued = Number(ts);
  if (!Number.isFinite(issued) || now - issued > STATE_TTL_MS || issued > now + 60_000) return false;
  const expected = createHmac("sha256", secret).update(`${uid}.${ts}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(mac);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) throw new Error("MP_CLIENT_ID não configurada.");
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: MP_REDIRECT_URI,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

export interface MpTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number | string;
}

async function tokenRequest(body: Record<string, string>): Promise<MpTokens> {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("MP_CLIENT_ID/MP_CLIENT_SECRET não configuradas.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
  });
  if (!res.ok) throw new Error(`Mercado Pago OAuth ${res.status}`);
  const data = (await res.json()) as Partial<MpTokens>;
  if (!data.access_token || !data.refresh_token || !data.expires_in) throw new Error("Resposta de OAuth incompleta.");
  return data as MpTokens;
}

export function exchangeCode(code: string): Promise<MpTokens> {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: MP_REDIRECT_URI });
}

export function refreshTokens(refreshToken: string): Promise<MpTokens> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export async function saveConnection(admin: SupabaseClient<any>, userId: string, t: MpTokens): Promise<void> {
  const { error } = await admin.from("seller_connections").upsert({
    user_id: userId,
    provider: "mercadopago",
    provider_user_id: String(t.user_id),
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function hasConnection(admin: SupabaseClient<any>, userId: string): Promise<boolean> {
  const { data } = await admin.from("seller_connections").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

/**
 * Token do criador para cobrar na conta dele. Renova antes de vencer e grava o
 * novo par de tokens (o refresh_token anterior deixa de valer a cada renovação).
 */
export async function getSellerAccessToken(admin: SupabaseClient<any>, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("seller_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as { access_token: string | null; refresh_token: string | null; expires_at: string | null } | null;
  if (!row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS || !row.refresh_token) return row.access_token;

  try {
    const fresh = await refreshTokens(row.refresh_token);
    await saveConnection(admin, userId, fresh);
    return fresh.access_token;
  } catch (err) {
    console.error("[mp-oauth] falha ao renovar token", err);
    // Ainda válido? Usa o atual; se já venceu, o criador precisa reconectar.
    return expiresAt > Date.now() ? row.access_token : null;
  }
}
