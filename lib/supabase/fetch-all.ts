/**
 * O PostgREST (Supabase) devolve no máximo 1000 linhas por consulta, sem
 * avisar — um `select` simples sobre uma tabela maior que isso é truncado e
 * relatórios passam a subcontar. Esta função pagina com `.range()` até
 * acabar. `buildQuery` recebe o intervalo e devolve a query já com `.order()`
 * estável (senão linhas podem repetir ou sumir entre páginas).
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}
