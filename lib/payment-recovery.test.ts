import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPayments = vi.fn();
const audit = vi.fn();
const processPayment = vi.fn();
const sendEmail = vi.fn();

vi.mock("@/lib/payment-audit", () => ({
  fetchApprovedSitePayments: (...a: unknown[]) => fetchPayments(...a),
  auditMercadoPagoPayments: (...a: unknown[]) => audit(...a),
}));
vi.mock("@/lib/payment-sync", () => ({
  processMercadoPagoPayment: (...a: unknown[]) => processPayment(...a),
}));
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { alertAdminAboutProblems, releaseApprovedPayments } from "./payment-recovery";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const upsert = vi.fn();

function admin(unpublishedIds: string[]) {
  return {
    from: (table: string) => {
      if (table === "payment_followups") return { upsert };
      return {
        select: () => ({
          in: () => ({
            neq: async () => ({ data: unpublishedIds.map((id) => ({ id })), error: null }),
          }),
        }),
      };
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.ADMIN_EMAILS = "dono@x.com";
});

describe("releaseApprovedPayments (rede de segurança sem webhook)", () => {
  it("libera só os pagamentos aprovados cuja campanha ainda não está no ar", async () => {
    fetchPayments.mockResolvedValue({
      ignored: 0,
      payments: [
        { id: 1, external_reference: UUID_A },
        { id: 2, external_reference: UUID_B },
      ],
    });
    processPayment.mockResolvedValue({ campaignId: UUID_A, paymentStatus: "confirmed", published: true });

    const result = await releaseApprovedPayments(admin([UUID_A]));

    expect(processPayment).toHaveBeenCalledTimes(1);
    expect(processPayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 1 }));
    expect(result).toEqual({ checked: 1, released: 1 });
  });

  it("sem pagamentos do site, não faz nada", async () => {
    fetchPayments.mockResolvedValue({ ignored: 2, payments: [] });
    expect(await releaseApprovedPayments(admin([]))).toEqual({ checked: 0, released: 0 });
  });
});

describe("alertAdminAboutProblems", () => {
  const OLD = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const row = (over: object) => ({
    paymentId: "9", status: "campaign_deleted", amount: 59.9, createdAt: OLD,
    payerEmail: null, accountEmail: "gaahto@gmail.com", campaignId: UUID_A, campaignTitle: null, alerted: false,
    ...over,
  });

  it("avisa por e-mail uma vez e marca como avisado", async () => {
    audit.mockResolvedValue({ rows: [row({})], ignored: 0, resolved: 0, error: null });
    sendEmail.mockResolvedValue(true);

    const result = await alertAdminAboutProblems(admin([]));

    expect(result).toEqual({ alerted: 1 });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["dono@x.com"], text: expect.stringContaining("gaahto@gmail.com") })
    );
    expect(upsert).toHaveBeenCalled();
  });

  it("não reavisa o que já foi avisado, nem o que é recente demais", async () => {
    audit.mockResolvedValue({
      rows: [row({ alerted: true }), row({ paymentId: "10", createdAt: new Date().toISOString() })],
      ignored: 0, resolved: 0, error: null,
    });
    expect(await alertAdminAboutProblems(admin([]))).toEqual({ alerted: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("se o e-mail falhar, não marca como avisado (tenta de novo depois)", async () => {
    audit.mockResolvedValue({ rows: [row({})], ignored: 0, resolved: 0, error: null });
    sendEmail.mockResolvedValue(false);
    expect(await alertAdminAboutProblems(admin([]))).toEqual({ alerted: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });
});
