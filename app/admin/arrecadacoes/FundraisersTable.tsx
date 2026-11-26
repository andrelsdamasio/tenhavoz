"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import DataTable from "@/components/admin/DataTable";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { setFundraiserStatusAction } from "./actions";

export interface FundraiserTableRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  statusLabel: string;
  ownerEmail: string | null;
  connected: boolean;
  raised: string;
  goal: string;
  raisedCents: number;
  donations: number;
  createdAt: string;
}

const PILL: Record<string, string> = {
  active: "border-folha bg-folha/10 text-folha",
  suspended: "border-red-600 text-red-700",
  draft: "border-ink/40 text-ink-soft",
  ended: "border-ink/40 text-ink-soft",
};

const columns: ColumnDef<FundraiserTableRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Campanha",
    cell: ({ row }) => (
      <div className="max-w-[16rem] [overflow-wrap:anywhere]">
        <Link href={`/d/${row.original.slug}`} target="_blank" className="font-bold underline-offset-4 hover:underline">
          {row.original.title}
        </Link>
        <p className="text-xs text-ink-soft">/{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "ownerEmail",
    header: "Criador",
    cell: ({ row }) => (
      <div className="[overflow-wrap:anywhere]">
        {row.original.ownerEmail ?? "—"}
        {!row.original.connected && <p className="text-xs font-semibold text-brand-600">Mercado Pago não conectado</p>}
      </div>
    ),
  },
  {
    accessorKey: "statusLabel",
    header: "Situação",
    cell: ({ row }) => (
      <span className={`whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-xs font-extrabold uppercase ${PILL[row.original.status] ?? PILL.draft}`}>
        {row.original.statusLabel}
      </span>
    ),
  },
  {
    accessorKey: "raisedCents",
    header: "Arrecadado / meta",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.raised} / {row.original.goal}</span>,
  },
  { accessorKey: "donations", header: "Doações" },
  {
    accessorKey: "createdAt",
    header: "Criada",
    cell: (c) => formatDistanceToNow(new Date(c.getValue() as string), { locale: ptBR, addSuffix: true }),
  },
  {
    id: "acoes",
    header: () => <span className="sr-only">Ações</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      if (r.status !== "active" && r.status !== "suspended") return null;
      const suspending = r.status === "active";
      return (
        <form action={setFundraiserStatusAction}>
          <input type="hidden" name="fundraiserId" value={r.id} />
          <input type="hidden" name="status" value={suspending ? "suspended" : "active"} />
          <ConfirmButton
            label={suspending ? "Suspender" : "Reativar"}
            title={suspending ? "Suspender esta arrecadação?" : "Reativar esta arrecadação?"}
            description={suspending ? "A página sai do ar e ninguém consegue doar até você reativar." : "A página volta ao ar e passa a receber doações."}
            confirmLabel={suspending ? "Suspender" : "Reativar"}
            danger={suspending}
            className={`whitespace-nowrap rounded-md border-2 px-3 py-1 text-xs font-bold ${suspending ? "border-red-300 text-red-700 hover:bg-red-50" : "border-ink/60 hover:bg-paper-deep"}`}
          />
        </form>
      );
    },
  },
];

export default function FundraisersTable({ rows }: { rows: FundraiserTableRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      csvName="arrecadacoes"
      csv={(r) => ({ campanha: r.title, link: r.slug, criador: r.ownerEmail ?? "", situacao: r.statusLabel, arrecadado: r.raised, meta: r.goal, doacoes: r.donations })}
      searchPlaceholder="Buscar campanha ou criador…"
      empty="Nenhuma campanha de arrecadação ainda."
    />
  );
}
