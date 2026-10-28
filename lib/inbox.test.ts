import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { extractAddress, htmlToText, isValidEmailAddress, sendFromInbox, storeAndForwardEmail, verifyResendSignature } from "./inbox";

const SECRET_RAW = Buffer.from("chave-super-secreta-de-teste");
const SECRET = `whsec_${SECRET_RAW.toString("base64")}`;
const NOW = 1_800_000_000_000;

function sign(id: string, ts: string, body: string) {
  return "v1," + createHmac("sha256", SECRET_RAW).update(`${id}.${ts}.${body}`).digest("base64");
}

describe("verifyResendSignature", () => {
  const ts = String(NOW / 1000);
  const body = '{"type":"email.received"}';

  it("aceita assinatura correta", () => {
    expect(verifyResendSignature(body, { id: "m1", timestamp: ts, signature: sign("m1", ts, body) }, SECRET, NOW)).toBe(true);
  });
  it("aceita quando há várias assinaturas e uma é válida", () => {
    const sig = `v1,AAAA ${sign("m1", ts, body)}`;
    expect(verifyResendSignature(body, { id: "m1", timestamp: ts, signature: sig }, SECRET, NOW)).toBe(true);
  });
  it("recusa corpo alterado, segredo errado, sem headers e mensagem antiga", () => {
    const sig = sign("m1", ts, body);
    expect(verifyResendSignature(body + " ", { id: "m1", timestamp: ts, signature: sig }, SECRET, NOW)).toBe(false);
    expect(verifyResendSignature(body, { id: "m1", timestamp: ts, signature: sig }, "whsec_b3V0cm8=", NOW)).toBe(false);
    expect(verifyResendSignature(body, { id: null, timestamp: ts, signature: sig }, SECRET, NOW)).toBe(false);
    expect(verifyResendSignature(body, { id: "m1", timestamp: ts, signature: sig }, undefined, NOW)).toBe(false);
    expect(verifyResendSignature(body, { id: "m1", timestamp: ts, signature: sig }, SECRET, NOW + 10 * 60 * 1000)).toBe(false);
  });
});

describe("helpers", () => {
  it("extractAddress", () => {
    expect(extractAddress("Ana <ana@x.com>")).toBe("ana@x.com");
    expect(extractAddress("ana@x.com")).toBe("ana@x.com");
  });
  it("htmlToText tira tags e scripts", () => {
    expect(htmlToText("<style>a{}</style><p>Oi&nbsp;<b>você</b></p><script>x()</script>")).toBe("Oi você");
  });
});

describe("storeAndForwardEmail", () => {
  const upsert = vi.fn();
  const update = vi.fn();
  let existing: { id: string; forwarded_at: string | null } | null;

  const admin = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }),
      upsert: (...a: unknown[]) => { upsert(...a); return Promise.resolve({ error: null }); },
      update: (...a: unknown[]) => { update(...a); return { eq: async () => ({}) }; },
    }),
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    existing = null;
    process.env.RESEND_API_KEY = "re_x";
    process.env.ADMIN_EMAILS = "nexcel09@gmail.com";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "abc12345", from: "Cliente <cli@x.com>", to: ["suporte@tenhavoz.com.br"], subject: "Ajuda", text: "Não liberou", html: null, attachments: [] }),
    })));
  });

  it("guarda e encaminha ao admin com reply-to do remetente", async () => {
    sendEmail.mockResolvedValue(true);
    expect(await storeAndForwardEmail(admin, "abc12345")).toEqual({ stored: true, forwarded: true });
    expect(upsert).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["nexcel09@gmail.com"], replyTo: "cli@x.com", subject: "[TenhaVoz] Ajuda" })
    );
    expect(update).toHaveBeenCalled();
  });

  it("reentrega do mesmo e-mail não duplica nem reencaminha", async () => {
    existing = { id: "1", forwarded_at: new Date().toISOString() };
    expect(await storeAndForwardEmail(admin, "abc12345")).toEqual({ stored: false, forwarded: false });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("se o encaminhamento falhar, guarda mas não marca como encaminhado", async () => {
    sendEmail.mockResolvedValue(false);
    expect(await storeAndForwardEmail(admin, "abc12345")).toEqual({ stored: true, forwarded: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("recusa id de e-mail com formato estranho", async () => {
    await expect(storeAndForwardEmail(admin, "../x")).rejects.toThrow();
  });
});

describe("sendFromInbox", () => {
  const makeAdmin = () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    return { insert, admin: { from: () => ({ insert }) } as never };
  };
  beforeEach(() => sendEmail.mockReset());

  it("valida endereços", () => {
    expect(isValidEmailAddress("a@b.com")).toBe(true);
    expect(isValidEmailAddress("a b@c.com")).toBe(false);
  });

  it("envia e grava cópia em Enviados", async () => {
    sendEmail.mockResolvedValue(true);
    const { insert, admin } = makeAdmin();
    const r = await sendFromInbox(admin, { to: "x@y.com", subject: "Oi", body: "Olá", replyToId: "id1" });
    expect(r.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ direction: "out", reply_to_id: "id1" }));
  });

  it("não grava cópia se o envio falhar", async () => {
    sendEmail.mockResolvedValue(false);
    const { insert, admin } = makeAdmin();
    const r = await sendFromInbox(admin, { to: "x@y.com", subject: "Oi", body: "Olá" });
    expect(r.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejeita destinatário inválido", async () => {
    const { admin } = makeAdmin();
    expect((await sendFromInbox(admin, { to: "nope", subject: "a", body: "b" })).ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
