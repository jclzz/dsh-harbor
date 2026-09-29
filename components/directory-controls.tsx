'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon } from '@/components/icons'
import { SORTS } from '@/lib/sort'
import type { CategoryId } from '@/lib/types'

function buildQuery(
  current: URLSearchParams,
  patch: Record<string, string | number | undefined | null>
): string {
  const params = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '' || value === 'all') params.delete(key)
    else params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function DirectoryControls({
  total,
  categories,
  perPage,
}: {
  total: number
  categories: Array<{ id: CategoryId | 'all'; label: string; count: number }>
  perPage: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const urlQ = searchParams.get('q') ?? ''
  const [value, setValue] = useState(urlQ)
  const committed = useRef(urlQ)

  // 浏览器前进/后退时同步输入框
  useEffect(() => {
    if (urlQ !== committed.current) {
      committed.current = urlQ
      setValue(urlQ)
    }
  }, [urlQ])

  useEffect(() => {
    if (value === committed.current) return
    const timer = setTimeout(() => {
      committed.current = value
      startTransition(() => {
        router.replace(`${pathname}${buildQuery(searchParams, { q: value, page: undefined })}`, {
          scroll: false,
        })
      })
    }, 280)
    return () => clearTimeout(timer)
  }, [value, pathname, router, searchParams])

  const sort = searchParams.get('sort') ?? 'stars'
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid'
  const activeCategory = searchParams.get('category') ?? 'all'

  return (
    <>
      <div className="toolbar">
        <div className="search-box">
          <SearchIcon />
          <input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="搜索插件名称、描述、标签或作者…"
            aria-label="搜索插件"
          />
          {value ? (
            <button type="button" className="clear" onClick={() => setValue('')} aria-label="清空搜索">
              ×
            </button>
          ) : null}
        </div>

        <select
          className="select"
          value={sort}
          aria-label="排序方式"
          onChange={(event) => {
            startTransition(() => {
              router.replace(
                `${pathname}${buildQuery(searchParams, { sort: event.target.value, page: undefined })}`,
                { scroll: false }
              )
            })
          }}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            startTransition(() => {
              router.replace(
                `${pathname}${buildQuery(searchParams, {
                  view: view === 'list' ? undefined : 'list',
                  page: undefined,
                })}`,
                { scroll: false }
              )
            })
          }}
        >
          {view === 'list' ? '卡片视图' : '列表视图'}
        </button>

        <span className="count" style={{ opacity: pending ? 0.5 : 1 }}>
          {total} 个插件 · 每页 {perPage}
        </span>
      </div>

      <div className="cat-row">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip${c.id === activeCategory ? ' on' : ''}`}
            onClick={() => {
              startTransition(() => {
                router.replace(
                  `${pathname}${buildQuery(searchParams, {
                    category: c.id === 'all' ? undefined : c.id,
                    page: undefined,
                  })}`,
                  { scroll: false }
                )
              })
            }}
          >
            {c.label}
            <span className="cnt">{c.count}</span>
          </button>
        ))}
      </div>
    </>
  )
}
