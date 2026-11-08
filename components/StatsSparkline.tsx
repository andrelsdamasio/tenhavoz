import type { DayStat } from "@/lib/campaign-stats";

/** Barras das visualizações por dia (e um ponto para os cliques). Sem JavaScript no navegador. */
export default function StatsSparkline({ days }: { days: DayStat[] }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.views, d.clicks)));
  const W = 168;
  const H = 40;
  const gap = 2;
  const barW = (W - gap * (days.length - 1)) / days.length;
  const total = days.reduce((n, d) => n + d.views, 0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Visualizações nos últimos ${days.length} dias: ${total} no total`}
      className="overflow-visible"
    >
      {days.map((d, i) => {
        const h = d.views === 0 ? 1.5 : Math.max(2, (d.views / max) * (H - 4));
        const x = i * (barW + gap);
        return (
          <g key={d.date}>
            <title>{`${d.date.split("-").reverse().slice(0, 2).join("/")}: ${d.views} visualizações, ${d.clicks} cliques`}</title>
            <rect
              x={x}
              y={H - h}
              width={barW}
              height={h}
              rx={1.5}
              className={d.views === 0 ? "fill-gray-200" : "fill-brand-500"}
            />
            {d.clicks > 0 && (
              <circle cx={x + barW / 2} cy={H - (d.clicks / max) * (H - 4) - 1} r={1.8} className="fill-amber-500" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
