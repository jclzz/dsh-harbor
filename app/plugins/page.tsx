import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, SearchIcon, StarIcon } from '@/components/icons'
import { DirectoryControls } from '@/components/directory-controls'
import { Pager } from '@/components/pager'
import { PluginCard } from '@/components/plugin-card'
import { CATEGORIES, categoryDesc, categoryLabel, isCategoryId } from '@/lib/categories'
import {
  allPlugins,
  avatarChar,
  formatStars,
  gradientFor,
  initialsFor,
  isSortKey,
  queryPlugins,
  readCatalog,
  relativeTime,
  statsOf,
} from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'

export const revalidate = 30

const PER_PAGE = 24

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const sp = await searchParams
  const q = first(sp.q)
  const category = first(sp.category)
  const page = Number(first(sp.page) ?? 1) || 1

  const parts: string[] = []
  if (q) parts.push(`搜索「${q}」`)
  if (isCategoryId(category)) parts.push(`${categoryLabel(category)}插件`)
  const suffix = parts.length ? parts.join(' · ') : '插件库'

  return {
    title: `${suffix}${page > 1 ? ` · 第 ${page} 页` : ''}`,
    description: isCategoryId(category)
      ? `${categoryDesc(category)} —— 插件港收录的 DeepSeek Harness（DSH）社区插件，附安装命令与仓库来源。`
      : '浏览插件港收录的全部 DeepSeek Harness（DSH）社区插件，按分类、Star、更新时间筛选，一键复制安装命令。',
    alternates: { canonical: page > 1 ? `/plugins?page=${page}` : '/plugins' },
  }
}

export default async function PluginsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const plugins = allPlugins()
  const stats = statsOf(plugins)
  const catalogUpdatedAt = readCatalog().updatedAt

  const q = first(sp.q) ?? ''
  const rawCategory = first(sp.category)
  const category: CategoryId | 'all' = isCategoryId(rawCategory) ? rawCategory : 'all'
  const rawSort = first(sp.sort)
  const sort = isSortKey(rawSort) ? rawSort : 'stars'
  const page = Math.max(1, Number(first(sp.page) ?? 1) || 1)
  const view = first(sp.view) === 'list' ? 'list' : 'grid'

  const result = queryPlugins(plugins, { q, category, sort, page, perPage: PER_PAGE })

  const chips = [
    { id: 'all' as const, label: '全部', count: stats.total },
    ...CATEGORIES.map((c) => ({
      id: c.id as CategoryId | 'all',
      label: c.label,
      count: stats.perCategory[c.id] ?? 0,
    })),
  ]

  const heading = q
    ? `搜索「${q}」`
    : category !== 'all'
      ? `${categoryLabel(category)}插件`
      : '插件库'

  const params: Record<string, string | undefined> = {
    q: q || undefined,
    category: category !== 'all' ? category : undefined,
    sort: sort !== 'stars' ? sort : undefined,
    view: view === 'list' ? 'list' : undefined,
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <nav className="breadcrumb">
          <Link href="/">首页</Link>
          <ChevronRight size={12} />
          <span>插件库</span>
          {category !== 'all' ? (
            <>
              <ChevronRight size={12} />
              <span>{categoryLabel(category)}</span>
            </>
          ) : null}
        </nav>
        <h1>{heading}</h1>
        <p className="sub">
          {category !== 'all'
            ? categoryDesc(category)
            : `收录 ${stats.total} 个 DeepSeek Harness 社区插件，均由公开 GitHub 仓库提供，可查看源码与许可证后再安装。`}
        </p>
      </div>

      <Suspense fallback={<div className="toolbar" style={{ minHeight: 78 }} />}>
        <DirectoryControls total={result.total} categories={chips} perPage={PER_PAGE} />
      </Suspense>

      {result.items.length === 0 ? (
        <div className="empty">
          <h3>没有找到匹配的插件</h3>
          <p>
            换个关键词，或者清掉分类筛选试试。
            <br />
            如果你知道一个还没被收录的 DSH 插件，欢迎直接提交。
          </p>
          <div className="actions">
            <Link className="btn btn-ghost" href="/plugins">
              清空筛选
            </Link>
            <Link className="btn btn-primary" href="/submit">
              提交插件
            </Link>
          </div>
        </div>
      ) : view === 'list' ? (
        <div className="plist">
          {result.items.map((plugin) => {
            const author = plugin.author || plugin.owner
            return (
              <Link className="row" key={plugin.slug} href={`/plugins/${plugin.slug}`}>
                <span className="picon" aria-hidden="true">
                  {initialsFor(plugin.name, plugin.icon)}
                </span>
                <div className="row-main">
                  <div className="row-title">
                    <span className="row-name">{plugin.name}</span>
                    <span className="badge">{categoryLabel(plugin.category)}</span>
                    {plugin.version ? <span className="badge">v{plugin.version.replace(/^v/, '')}</span> : null}
                    {plugin.status === 'verified' ? <span className="badge ok">已核验</span> : null}
                  </div>
                  <div className="row-sub">{plugin.description}</div>
                </div>
                <div className="row-meta">
                  <span className="row-author">
                    <span className="avatar" style={{ background: gradientFor(plugin.owner) }}>
                      {avatarChar(author)}
                    </span>
                    {author}
                  </span>
                  <span className="row-time" style={{ width: 'auto' }}>
                    <StarIcon /> {formatStars(plugin.stars)}
                  </span>
                  <ChevronRight className="row-arrow" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="result-grid">
          {result.items.map((plugin) => (
            <PluginCard key={plugin.slug} plugin={plugin} />
          ))}
        </div>
      )}

      <Pager page={result.page} pages={result.pages} base="/plugins" params={params} />

      {result.items.length > 0 ? (
        <p
          style={{
            marginTop: 28,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          第 {result.page} / {result.pages} 页 · 共 {result.total} 个插件 · 数据同步于{' '}
          {relativeTime(catalogUpdatedAt)}
        </p>
      ) : null}
    </div>
  )
}
