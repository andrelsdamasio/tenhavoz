import { describe, expect, it } from "vitest";
import {
  buildOverview,
  classifyCampaign,
  matchesFilter,
  parseFilter,
  type CampaignLite,
  type PaymentLite,
} from "./admin-dashboard";
import { periodKey } from "./reports";
import { fetchAllRows } from "./supabase/fetch-all";

const NOW = new Date("2026-10-11T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function campaign(overrides: Partial<CampaignLite> = {}): CampaignLite {
  return {
    id: "c1",
    user_id: "u1",
    title: "Campanha",
    slug: "campanha",
    status: "published",
    created_at: "2026-10-01T12:00:00.000Z",
    expires_at: new Date(NOW.getTime() + 100 * HOUR).toISOString(),
    duration_hours: 168,
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentLite> = {}): PaymentLite {
  return {
    campaign_id: "c1",
    status: "confirmed",
    amount: 49.9,
    created_at: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("classifyCampaign — ciclo de vida", () => {
  it("rascunho: não paga", () => {
    const c = classifyCampaign(campaign({ status: "draft", expires_at: null }), [], NOW);
    expect(c.lifecycle).toBe("draft");
    expect(c.billing).toBe("unpaid");
  });

  it("rascunho com pagamento pendente/falho continua não pago", () => {
    const c = classifyCampaign(
      campaign({ status: "draft", expires_at: null }),
      [payment({ status: "pending" }), payment({ status: "failed" })],
      NOW
    );
    expect(c.billing).toBe("unpaid");
  });

  it("status 'paid' é publicando", () => {
    const c = classifyCampaign(campaign({ status: "paid", expires_at: null }), [payment()], NOW);
    expect(c.lifecycle).toBe("publishing");
  });

  it("publicada dentro do prazo é ativa", () => {
    expect(classifyCampaign(campaign(), [payment()], NOW).lifecycle).toBe("active");
  });

  it("publicada com prazo vencido é vencida", () => {
    const c = classifyCampaign(
      campaign({ expires_at: new Date(NOW.getTime() - HOUR).toISOString() }),
      [payment()],
      NOW
    );
    expect(c.lifecycle).toBe("expired");
    expect(c.msUntilExpiry).toBeLessThan(0);
  });

  it("vence exatamente agora conta como vencida", () => {
    const c = classifyCampaign(campaign({ expires_at: NOW.toISOString() }), [payment()], NOW);
    expect(c.lifecycle).toBe("expired");
  });

  it("publicada sem prazo (campanhas antigas) nunca vence", () => {
    const c = classifyCampaign(campaign({ expires_at: null }), [payment()], NOW);
    expect(c.lifecycle).toBe("active");
    expect(c.msUntilExpiry).toBeNull();
    expect(c.expiringSoon).toBe(false);
  });

  it("ativa que acaba em menos de 48h está encerrando", () => {
    const soon = classifyCampaign(
      campaign({ expires_at: new Date(NOW.getTime() + 47 * HOUR).toISOString() }),
      [payment()],
      NOW
    );
    const later = classifyCampaign(
      campaign({ expires_at: new Date(NOW.getTime() + 49 * HOUR).toISOString() }),
      [payment()],
      NOW
    );
    expect(soon.expiringSoon).toBe(true);
    expect(later.expiringSoon).toBe(false);
  });

  it("vencida não conta como encerrando", () => {
    const c = classifyCampaign(
      campaign({ expires_at: new Date(NOW.getTime() - HOUR).toISOString() }),
      [payment()],
      NOW
    );
    expect(c.expiringSoon).toBe(false);
  });
});

describe("classifyCampaign — paga ou grátis", () => {
  it("publicada com pagamento confirmado é paga", () => {
    const c = classifyCampaign(campaign(), [payment({ amount: 49.9 })], NOW);
    expect(c.billing).toBe("paid");
    expect(c.amountPaid).toBeCloseTo(49.9);
  });

  it("publicada sem nenhum pagamento é grátis (cupom 100% e admin não gravam payments)", () => {
    const c = classifyCampaign(campaign(), [], NOW);
    expect(c.billing).toBe("free");
    expect(c.amountPaid).toBe(0);
  });

  it("pagamento confirmado de valor 0 não conta como paga", () => {
    expect(classifyCampaign(campaign(), [payment({ amount: 0 })], NOW).billing).toBe("free");
  });

  it("só reembolso: reembolsada", () => {
    const c = classifyCampaign(campaign(), [payment({ status: "refunded" })], NOW);
    expect(c.billing).toBe("refunded");
  });

  it("pagamento confirmado + outro reembolsado: continua paga", () => {
    const c = classifyCampaign(
      campaign(),
      [payment({ status: "refunded" }), payment({ status: "confirmed" })],
      NOW
    );
    expect(c.billing).toBe("paid");
  });

  it("pagamento só pendente numa campanha publicada não a torna paga", () => {
    expect(classifyCampaign(campaign(), [payment({ status: "pending" })], NOW).billing).toBe(
      "free"
    );
  });

  it("campanha vencida continua sendo paga ou grátis conforme o que aconteceu", () => {
    const expiredAt = new Date(NOW.getTime() - HOUR).toISOString();
    expect(
      classifyCampaign(campaign({ expires_at: expiredAt }), [payment()], NOW).billing
    ).toBe("paid");
    expect(classifyCampaign(campaign({ expires_at: expiredAt }), [], NOW).billing).toBe("free");
  });
});

describe("buildOverview e filtros", () => {
  const expiredAt = new Date(NOW.getTime() - HOUR).toISOString();
  const soonAt = new Date(NOW.getTime() + 10 * HOUR).toISOString();

  const payments: PaymentLite[] = [
    payment({ campaign_id: "paid-active", amount: 50 }),
    payment({ campaign_id: "paid-expired", amount: 80 }),
    payment({ campaign_id: "refunded", amount: 50, status: "refunded" }),
    payment({ campaign_id: "draft", status: "pending", amount: 50 }),
  ];

  const campaigns = [
    classifyCampaign(campaign({ id: "paid-active", expires_at: soonAt }), payments.slice(0, 1), NOW),
    classifyCampaign(campaign({ id: "paid-expired", expires_at: expiredAt }), [payments[1]!], NOW),
    classifyCampaign(campaign({ id: "free-active" }), [], NOW),
    classifyCampaign(campaign({ id: "free-expired", expires_at: expiredAt }), [], NOW),
    classifyCampaign(campaign({ id: "refunded" }), [payments[2]!], NOW),
    classifyCampaign(campaign({ id: "draft", status: "draft", expires_at: null }), [payments[3]!], NOW),
  ];

  const overview = buildOverview(campaigns, payments);

  it("conta cada categoria", () => {
    expect(overview.total).toBe(6);
    expect(overview.drafts).toBe(1);
    expect(overview.active).toBe(3); // paid-active, free-active, refunded
    expect(overview.expired).toBe(2); // paid-expired, free-expired
    expect(overview.expiringSoon).toBe(1); // paid-active
    expect(overview.paid).toBe(2);
    expect(overview.free).toBe(2);
    expect(overview.refunded).toBe(1);
    expect(overview.published).toBe(5);
  });

  it("calcula conversão de rascunho para publicada", () => {
    expect(overview.conversionRate).toBeCloseTo(5 / 6);
  });

  it("calcula receita bruta, reembolsada, líquida e ticket médio", () => {
    expect(overview.revenue.gross).toBe(130);
    expect(overview.revenue.refunded).toBe(50);
    expect(overview.revenue.net).toBe(80);
    expect(overview.revenue.averageTicket).toBe(65);
  });

  it("sem campanhas: conversão e ticket médio são null, não NaN", () => {
    const empty = buildOverview([], []);
    expect(empty.conversionRate).toBeNull();
    expect(empty.revenue.averageTicket).toBeNull();
    expect(empty.total).toBe(0);
  });

  it("os filtros batem com as contagens", () => {
    const count = (f: Parameters<typeof matchesFilter>[1]) =>
      campaigns.filter((c) => matchesFilter(c, f)).length;
    expect(count("all")).toBe(overview.total);
    expect(count("active")).toBe(overview.active);
    expect(count("expiring")).toBe(overview.expiringSoon);
    expect(count("expired")).toBe(overview.expired);
    expect(count("draft")).toBe(overview.drafts);
    expect(count("paid")).toBe(overview.paid);
    expect(count("free")).toBe(overview.free);
    expect(count("refunded")).toBe(overview.refunded);
  });

  it("parseFilter cai em 'all' para valor desconhecido", () => {
    expect(parseFilter("expired")).toBe("expired");
    expect(parseFilter("xyz")).toBe("all");
    expect(parseFilter(undefined)).toBe("all");
  });
});

describe("periodKey (horário de Brasília)", () => {
  it("22h de Brasília em 31/10 continua em outubro, mesmo sendo 01/11 em UTC", () => {
    const iso = "2026-11-01T01:00:00.000Z"; // 22:00 do dia 31/10 em Brasília
    expect(periodKey(iso, "day")).toBe("2026-10-31");
    expect(periodKey(iso, "month")).toBe("2026-10");
    expect(periodKey(iso, "year")).toBe("2026");
  });

  it("virada de ano respeita o fuso", () => {
    expect(periodKey("2027-01-01T02:00:00.000Z", "year")).toBe("2026");
    expect(periodKey("2027-01-01T03:00:00.000Z", "year")).toBe("2027");
  });
});

describe("fetchAllRows", () => {
  function fakeTable(total: number) {
    const all = Array.from({ length: total }, (_, i) => i);
    const calls: [number, number][] = [];
    const build = (from: number, to: number) => {
      calls.push([from, to]);
      return Promise.resolve({ data: all.slice(from, to + 1), error: null });
    };
    return { build, calls };
  }

  it("pagina além do limite de 1000 linhas do Supabase", async () => {
    const { build, calls } = fakeTable(2500);
    const rows = await fetchAllRows<number>(build);
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("não pede uma página extra quando o total é múltiplo exato menos um", async () => {
    const { build, calls } = fakeTable(999);
    expect(await fetchAllRows<number>(build)).toHaveLength(999);
    expect(calls).toHaveLength(1);
  });

  it("tabela vazia devolve lista vazia", async () => {
    const { build } = fakeTable(0);
    expect(await fetchAllRows<number>(build)).toEqual([]);
  });

  it("propaga o erro do banco", async () => {
    await expect(
      fetchAllRows<number>(() => Promise.resolve({ data: null, error: { message: "boom" } }))
    ).rejects.toEqual({ message: "boom" });
  });
});
