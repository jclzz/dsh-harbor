import fs from 'node:fs'
import path from 'node:path'
import { CATEGORY_IDS, CATEGORIES, categoryLabel, isCategoryId } from './categories'
import { SORTS, isSortKey } from './sort'
import type { SortKey } from './sort'
import type { CatalogFile, CatalogStats, CategoryId, Plugin } from './types'

/**
 * 目录存储：data/plugins.json 为唯一真源。
 * - 读：带 500ms 级别的 mtime 缓存，避免一次请求里反复读盘。
 * - 写：原子写（临时文件 + rename），并用一个串行队列避免并发写互相覆盖。
 * - 部署：需要可写文件系统（VPS / Docker / 本地）。若要部署到只读环境，
 *   把 HARBOR_DATA_DIR 指到挂载卷即可，或改用 scripts/sync.ts 提交回仓库。
 */

export const DATA_DIR = process.env.HARBOR_DATA_DIR
  ? path.resolve(process.env.HARBOR_DATA_DIR)
  : path.join(process.cwd(), 'data')

export const CATALOG_PATH = path.join(DATA_DIR, 'plugins.json')

const EMPTY: CatalogFile = { version: 1, updatedAt: new Date(0).toISOString(), plugins: [] }

type Cache = { mtimeMs: number; data: CatalogFile }
let cache: Cache | null = null

function readRaw(): CatalogFile {
  try {
    const stat = fs.statSync(CATALOG_PATH)
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.data
    const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as CatalogFile
    const data: CatalogFile = {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? new Date(stat.mtimeMs).toISOString(),
      plugins: Array.isArray(parsed.plugins) ? parsed.plugins : [],
    }
    cache = { mtimeMs: stat.mtimeMs, data }
    return data
  } catch {
    return EMPTY
  }
}

let writeQueue: Promise<unknown> = Promise.resolve()

function writeRaw(data: CatalogFile): void {
  const next: CatalogFile = { ...data, updatedAt: new Date().toISOString() }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${CATALOG_PATH}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n')
  fs.renameSync(tmp, CATALOG_PATH)
  cache = null
}

/** 串行化的读-改-写事务，返回更新后的目录 */
export function mutateCatalog<T>(fn: (data: CatalogFile) => T): Promise<T> {
  const run = async () => {
    const data = readRaw()
    const result = fn(data)
    writeRaw(data)
    return result
  }
  const next = writeQueue.then(run, run)
  // 保持队列存活但不吞掉错误
  writeQueue = next.catch(() => undefined)
  return next
}

export function readCatalog(): CatalogFile {
  return readRaw()
}

export function allPlugins(): Plugin[] {
  return readRaw().plugins
}

/* -------------------------------------------------------------------------- */
/* 查询                                                                        */
/* -------------------------------------------------------------------------- */

export { SORTS, isSortKey }
export type { SortKey }

export interface Query {
  q?: string
  category?: CategoryId | 'all'
  sort?: SortKey
  page?: number
  perPage?: number
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s_\-/.]+/g, '')
}

/** 关键词打分：名称命中 > 标签 > 描述，命中全部词才算匹配（AND 语义）。 */
export function scorePlugin(plugin: Plugin, terms: string[]): number {
  const name = normalize(`${plugin.name} ${plugin.nameZh ?? ''} ${plugin.repo}`)
  const owner = normalize(plugin.owner)
  const tags = normalize(plugin.tags.join(' '))
  const desc = normalize(`${plugin.description} ${categoryLabel(plugin.category)}`)

  let score = 0
  for (const term of terms) {
    const t = normalize(term)
    if (!t) continue
    let hit = 0
    if (name.includes(t)) hit += 10
    if (name.startsWith(t)) hit += 6
    if (owner.includes(t)) hit += 4
    if (tags.includes(t)) hit += 3
    if (desc.includes(t)) hit += 1
    if (!hit) return 0
    score += hit
  }
  return score
}

export function queryPlugins(
  plugins: Plugin[],
  { q, category = 'all', sort = 'stars', page = 1, perPage = 24 }: Query
): { items: Plugin[]; total: number; page: number; pages: number; perPage: number } {
  let items = plugins

  if (category !== 'all' && isCategoryId(category)) {
    items = items.filter((p) => p.category === category)
  }

  const terms = (q ?? '').trim().split(/\s+/).filter(Boolean)
  if (terms.length) {
    const scored: Array<{ p: Plugin; s: number }> = []
    for (const p of items) {
      const s = scorePlugin(p, terms)
      if (s > 0) scored.push({ p, s })
    }
    scored.sort((a, b) => b.s - a.s || b.p.stars - a.p.stars)
    items = scored.map((x) => x.p)
    const total = items.length
    const pages = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(Math.max(1, page), pages)
    return {
      items: items.slice((safePage - 1) * perPage, safePage * perPage),
      total,
      page: safePage,
      pages,
      perPage,
    }
  }

  items = [...items].sort(comparator(sort))
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), pages)
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    total,
    page: safePage,
    pages,
    perPage,
  }
}

export function comparator(sort: SortKey): (a: Plugin, b: Plugin) => number {
  switch (sort) {
    case 'updated':
      return (a, b) => ts(b.pushedAt ?? b.addedAt) - ts(a.pushedAt ?? a.addedAt)
    case 'added':
      return (a, b) => ts(b.addedAt) - ts(a.addedAt)
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, 'en')
    case 'stars':
    default:
      return (a, b) => b.stars - a.stars
  }
}

function ts(value: string | undefined): number {
  const t = value ? Date.parse(value) : 0
  return Number.isFinite(t) ? t : 0
}

/* -------------------------------------------------------------------------- */
/* 派生视图                                                                    */
/* -------------------------------------------------------------------------- */

export function findBySlug(slug: string): Plugin | undefined {
  const wanted = slug.toLowerCase()
  return allPlugins().find((p) => p.slug.toLowerCase() === wanted)
}

export function findByOwnerRepo(owner: string, repo: string): Plugin | undefined {
  return findBySlug(`${owner}/${repo}`)
}

export function statsOf(plugins: Plugin[]): CatalogStats {
  const authors = new Set(plugins.map((p) => p.owner.toLowerCase()))
  const perCategory = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0])) as Record<
    CategoryId,
    number
  >
  let stars = 0
  let verified = 0
  let group = 0
  let curatedCount = 0
  let addedThisWeek = 0
  const week = Date.now() - 7 * 86_400_000
  for (const p of plugins) {
    perCategory[p.category] = (perCategory[p.category] ?? 0) + 1
    stars += p.stars
    if (p.status !== 'listed') verified += 1
    if (p.source === 'group') group += 1
    if (p.source === 'curated') curatedCount += 1
    if (ts(p.addedAt) >= week) addedThisWeek += 1
  }
  return {
    total: plugins.length,
    authors: authors.size,
    stars,
    addedThisWeek,
    verified,
    group,
    curated: curatedCount,
    perCategory,
  }
}

export function featuredPlugins(limit = 6): Plugin[] {
  const plugins = allPlugins()
  const curated = plugins
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredRank ?? 999) - (b.featuredRank ?? 999))
  if (curated.length >= limit) return curated.slice(0, limit)
  const rest = plugins
    .filter((p) => !p.featured)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit - curated.length)
  return [...curated, ...rest]
}

export function latestPlugins(limit = 6): Plugin[] {
  return [...allPlugins()].sort(comparator('added')).slice(0, limit)
}

export interface Contributor {
  owner: string
  name: string
  count: number
  stars: number
  sample: Plugin
}

export function contributors(limit = 12): { list: Contributor[]; total: number } {
  const byOwner = new Map<string, Contributor>()
  for (const p of allPlugins()) {
    const key = p.owner.toLowerCase()
    const cur = byOwner.get(key)
    if (cur) {
      cur.count += 1
      cur.stars += p.stars
    } else {
      byOwner.set(key, {
        owner: p.owner,
        name: p.author ?? p.owner,
        count: 1,
        stars: p.stars,
        sample: p,
      })
    }
  }
  const list = [...byOwner.values()].sort(
    (a, b) => b.count - a.count || b.stars - a.stars || a.owner.localeCompare(b.owner)
  )
  return { list: list.slice(0, limit), total: byOwner.size }
}

export { CATEGORIES, CATEGORY_IDS, categoryLabel, isCategoryId }
export {
  avatarChar,
  defaultInstallCommand,
  formatDate,
  formatStars,
  gradientFor,
  initialsFor,
  licenseLabel,
  relativeTime,
} from './format'
