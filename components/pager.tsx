import Link from 'next/link'

function hrefFor(base: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  if (page > 1) search.set('page', String(page))
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

/** 页码序列：1 … n-1 n n+1 … last */
function pageItems(page: number, pages: number): Array<number | '…'> {
  const set = new Set<number>([1, pages, page, page - 1, page + 1])
  if (page <= 3) [2, 3, 4].forEach((n) => n < pages && set.add(n))
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => n > 1 && set.add(n))
  const sorted = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  let prev = 0
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push('…')
    out.push(n)
    prev = n
  }
  return out
}

export function Pager({
  page,
  pages,
  base = '/plugins',
  params = {},
}: {
  page: number
  pages: number
  base?: string
  params?: Record<string, string | undefined>
}) {
  if (pages <= 1) return null

  return (
    <nav className="pager" aria-label="分页">
      {page > 1 ? (
        <Link href={hrefFor(base, params, page - 1)} rel="prev">
          上一页
        </Link>
      ) : (
        <span className="disabled">上一页</span>
      )}

      {pageItems(page, pages).map((item, index) =>
        item === '…' ? (
          <span className="gap" key={`gap-${index}`}>
            …
          </span>
        ) : item === page ? (
          <span className="on" key={item} aria-current="page">
            {item}
          </span>
        ) : (
          <Link key={item} href={hrefFor(base, params, item)}>
            {item}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={hrefFor(base, params, page + 1)} rel="next">
          下一页
        </Link>
      ) : (
        <span className="disabled">下一页</span>
      )}
    </nav>
  )
}
