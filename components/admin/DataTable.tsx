"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Papa from "papaparse";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { useState } from "react";

/**
 * Tabela do admin: busca, ordenação por coluna, paginação e exportação CSV.
 * `csv` diz como transformar cada linha em texto para o arquivo.
 */
export default function DataTable<T>({
  data,
  columns,
  csv,
  csvName = "exportacao",
  searchPlaceholder = "Buscar…",
  empty = "Nada por aqui.",
  pageSize = 10,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  csv?: (row: T) => Record<string, string | number>;
  csvName?: string;
  searchPlaceholder?: string;
  empty?: string;
  pageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  function exportCsv() {
    if (!csv) return;
    const rows = table.getPrePaginationRowModel().rows.map((r) => csv(r.original));
    const blob = new Blob(["﻿" + Papa.unparse(rows, { delimiter: ";" })], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar na tabela</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border-2 border-ink/70 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>
        {csv && (
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink px-3 py-2 text-sm font-bold hover:bg-paper-deep">
            <Download aria-hidden="true" className="h-4 w-4" /> Exportar CSV
          </button>
        )}
      </div>

      <div tabIndex={0} role="region" aria-label="Tabela (rolar para o lado)" className="overflow-x-auto rounded-md border-2 border-ink bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-ink bg-paper-deep text-xs uppercase">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortable = h.column.getCanSort();
                  const dir = h.column.getIsSorted();
                  return (
                    <th key={h.id} scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined} className="px-4 py-2 font-extrabold">
                      {h.isPlaceholder ? null : sortable ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 uppercase">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? <ArrowUp aria-hidden="true" className="h-3 w-3" /> : dir === "desc" ? <ArrowDown aria-hidden="true" className="h-3 w-3" /> : <ArrowUpDown aria-hidden="true" className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y-2 divide-ink/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-soft">{empty}</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-paper/60">
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-4 py-2 align-top">{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
        <span>{total} {total === 1 ? "item" : "itens"}</span>
        {table.getPageCount() > 1 && (
          <span className="inline-flex items-center gap-2">
            <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded border-2 border-ink/50 px-2 py-1 disabled:opacity-40">Anterior</button>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded border-2 border-ink/50 px-2 py-1 disabled:opacity-40">Próxima</button>
          </span>
        )}
      </div>
    </div>
  );
}
