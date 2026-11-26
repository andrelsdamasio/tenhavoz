"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DataTable from "@/components/admin/DataTable";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { toggleCouponActiveAction, deleteCouponAction } from "./actions";

export interface CouponRow {
  id: string;
  code: string;
  discount: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
  status: "Ativo" | "Desativado" | "Esgotado" | "Expirado";
}

const PILL: Record<CouponRow["status"], string> = {
  Ativo: "border-folha bg-folha/10 text-folha",
  Desativado: "border-ink/40 text-ink-soft",
  Esgotado: "border-brand-600 text-brand-600",
  Expirado: "border-brand-600 text-brand-600",
};

const columns: ColumnDef<CouponRow, unknown>[] = [
  { accessorKey: "code", header: "Código", cell: (c) => <span className="font-mono font-bold">{c.getValue() as string}</span> },
  { accessorKey: "discount", header: "Desconto", enableSorting: false },
  {
    accessorKey: "uses",
    header: "Usos",
    cell: ({ row }) => `${row.original.uses}${row.original.maxUses !== null ? ` / ${row.original.maxUses}` : ""}`,
  },
  {
    accessorKey: "expiresAt",
    header: "Expira",
    cell: (c) => {
      const v = c.getValue() as string | null;
      return v ? format(new Date(v), "dd 'de' MMM yyyy", { locale: ptBR }) : "—";
    },
  },
  {
    accessorKey: "status",
    header: "Situação",
    cell: (c) => {
      const s = c.getValue() as CouponRow["status"];
      return <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-extrabold uppercase ${PILL[s]}`}>{s}</span>;
    },
  },
  {
    id: "acoes",
    header: () => <span className="sr-only">Ações</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex gap-2">
        <form action={toggleCouponActiveAction}>
          <input type="hidden" name="couponId" value={row.original.id} />
          <input type="hidden" name="nextActive" value={row.original.active ? "false" : "true"} />
          <button type="submit" className="rounded-md border-2 border-ink/60 px-3 py-1 text-xs font-bold hover:bg-paper-deep">
            {row.original.active ? "Desativar" : "Ativar"}
          </button>
        </form>
        <form action={deleteCouponAction}>
          <input type="hidden" name="couponId" value={row.original.id} />
          <ConfirmButton
            label="Excluir"
            title={`Excluir o cupom ${row.original.code}?`}
            description="Esta ação não pode ser desfeita. Quem já usou o cupom não é afetado."
            confirmLabel="Excluir cupom"
            danger
            className="rounded-md border-2 border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
          />
        </form>
      </div>
    ),
  },
];

export default function CouponsTable({ rows }: { rows: CouponRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      csvName="cupons"
      csv={(r) => ({ codigo: r.code, desconto: r.discount, usos: r.uses, limite: r.maxUses ?? "", expira: r.expiresAt ?? "", situacao: r.status })}
      searchPlaceholder="Buscar cupom…"
      empty="Nenhum cupom criado ainda."
    />
  );
}
