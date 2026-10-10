// PostgREST caps every response at the project's max-rows (1000 by default on
// Supabase). This pages with .range() so "load everything" queries are not
// silently truncated. Usage:
//   const rows = await fetchAll((from, to) => supabase.from('revenue').select('*').eq('organization_id', id).order('date').range(from, to))

export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  opts: { pageSize?: number; max?: number } = {},
): Promise<T[]> {
  const pageSize = opts.pageSize ?? 1000
  const max = opts.max ?? 20000
  const out: T[] = []
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < pageSize) break
  }
  return out
}
