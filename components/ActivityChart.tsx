"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartPoint = { date: string } & object;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

const dm = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/**
 * Gráfico de área interativo (passe o mouse ou toque para ver o valor de cada dia).
 * Cores da identidade; acompanha a largura da tela.
 */
export default function ActivityChart({
  data,
  series,
  format = (n) => n.toLocaleString("pt-BR"),
  summary,
  height = 220,
}: {
  data: ChartPoint[];
  series: ChartSeries[];
  format?: (n: number) => string;
  /** Texto para leitores de tela e para quem não vê o gráfico. */
  summary: string;
  height?: number;
}) {
  return (
    <figure className="m-0" aria-label={summary}>
      <div style={{ width: "100%", height }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#16120f" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dm} tick={{ fontSize: 11, fill: "#4a423a" }} tickLine={false} axisLine={{ stroke: "#16120f" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#4a423a" }} tickLine={false} axisLine={false} width={44} allowDecimals={false} tickFormatter={(v) => format(Number(v))} />
            <Tooltip
              labelFormatter={(l) => dm(String(l))}
              formatter={(v, name) => [format(Number(v)), name]}
              contentStyle={{ border: "2px solid #16120f", borderRadius: 6, background: "#f4eee2", fontSize: 13 }}
            />
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fill={`url(#fill-${s.key})`} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
