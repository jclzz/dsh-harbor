/**
 * 插件港 DSH Harbor 目录同步脚本
 *
 *   node --experimental-strip-types scripts/sync.ts            # 刷新已有条目 + 按精选清单补全
 *   node --experimental-strip-types scripts/sync.ts --discover # 额外从 GitHub `dsh-plugin` 话题发现新仓库
 *   node --experimental-strip-types scripts/sync.ts --dry      # 只打印，不写盘
 *   node --experimental-strip-types scripts/sync.ts --prune    # 移除已归档/私有/不存在的仓库
 *
 * 设计：机器字段（star / license / pushedAt / topics）由本脚本覆盖；
 * 人工字段（nameZh / desc / category / featured / author / addedAt / submittedBy）永不覆盖。
 * 因此可以放心反复运行。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { inferCategory } from '../lib/categories.ts'
import type { CatalogFile, CategoryId, Plugin } from '../lib/types.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = process.env.HARBOR_DATA_DIR
  ? path.resolve(process.env.HARBOR_DATA_DIR)
  : path.join(ROOT, 'data')
const CATALOG_PATH = path.join(DATA_DIR, 'plugins.json')

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry')
const DISCOVER = args.has('--discover')
const PRUNE = args.has('--prune')

/* -------------------------------------------------------------------------- */
/* GitHub 取数                                                                 */
/* -------------------------------------------------------------------------- */

interface RepoMeta {
  nameWithOwner: string
  name: string
  description: string | null
  url: string
  homepageUrl: string | null
  stargazerCount: number
  forkCount: number
  pushedAt: string | null
  createdAt: string | null
  isArchived: boolean
  isPrivate?: boolean
  primaryLanguage: { name: string } | null
  licenseInfo: { spdxId: string | null; name: string } | null
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> }
  latestRelease: { tagName: string } | null
  issues?: { totalCount: number }
}

const FIELDS = `
  nameWithOwner name description url homepageUrl stargazerCount forkCount
  pushedAt createdAt isArchived
  primaryLanguage { name }
  licenseInfo { spdxId name }
  repositoryTopics(first: 24) { nodes { topic { name } } }
  latestRelease { tagName }
  issues(states: OPEN) { totalCount }
`

function hasGh(): boolean {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const GH = !process.env.GITHUB_TOKEN && hasGh()
const TOKEN = process.env.GITHUB_TOKEN ?? ''

async function graphql(query: string): Promise<Record<string, RepoMeta | null>> {
  if (GH) {
    const out = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    return JSON.parse(out).data
  }
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'dsh-harbor-sync',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`graphql ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { data?: Record<string, RepoMeta | null>; errors?: unknown }
  if (json.errors) throw new Error(`graphql errors: ${JSON.stringify(json.errors)}`)
  return json.data ?? {}
}

/** 一次请求塞多个仓库（GraphQL alias），40 个一批，避免超时与速率尖峰。 */
async function fetchRepos(repos: string[]): Promise<Map<string, RepoMeta>> {
  const found = new Map<string, RepoMeta>()
  const CHUNK = 40
  for (let i = 0; i < repos.length; i += CHUNK) {
    const chunk = repos.slice(i, i + CHUNK)
    const parts = chunk.map((full, idx) => {
      const [owner, name] = full.split('/')
      return `r${idx}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${FIELDS} }`
    })
    const query = `query { ${parts.join('\n')} }`
    let data: Record<string, RepoMeta | null>
    try {
      data = await graphql(query)
    } catch (error) {
      console.error(`  ! 批次失败（${chunk.length} 个），改为逐个重试：${String(error).slice(0, 120)}`)
      for (const full of chunk) {
        try {
          const one = await graphql(
            `query { r0: repository(owner: ${JSON.stringify(full.split('/')[0])}, name: ${JSON.stringify(full.split('/')[1])}) { ${FIELDS} } }`
          )
          if (one.r0) found.set(full.toLowerCase(), one.r0)
        } catch {
          console.error(`    x 取不到 ${full}`)
        }
      }
      continue
    }
    chunk.forEach((full, idx) => {
      const meta = data[`r${idx}`]
      if (meta && !meta.isArchived) found.set(full.toLowerCase(), meta)
      else console.warn(`  x 跳过 ${full}（${meta ? '已归档' : '不存在'}）`)
    })
    process.stdout.write(`  · 已获取 ${Math.min(i + CHUNK, repos.length)}/${repos.length}\r`)
  }
  process.stdout.write('\n')
  return found
}

/** 从 GitHub 话题发现新仓库（按 star 降序，最多 3 页 × 100）。 */
async function discoverRepos(pages = 3): Promise<string[]> {
  const out: string[] = []
  for (let page = 1; page <= pages; page += 1) {
    const q = encodeURIComponent('topic:dsh-plugin')
    const api = `search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`
    try {
      const raw = GH
        ? execFileSync('gh', ['api', api], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
        : await (
            await fetch(`https://api.github.com/${api}`, {
              headers: {
                authorization: `bearer ${TOKEN}`,
                accept: 'application/vnd.github+json',
                'user-agent': 'dsh-harbor-sync',
              },
            })
          ).text()
      const json = JSON.parse(raw) as {
        items?: Array<{ full_name: string; archived: boolean; fork: boolean; description: string | null }>
      }
      for (const item of json.items ?? []) {
        if (item.archived || item.fork) continue
        if (isDshRelated(item.full_name, item.description ?? '')) out.push(item.full_name)
      }
    } catch (error) {
      console.warn(`  ! 话题发现第 ${page} 页失败：${String(error).slice(0, 120)}`)
      break
    }
  }
  return out
}

/** 话题里混了不少蹭标签的通用 AI 项目，这里做一道相关性过滤。 */
function isDshRelated(fullName: string, description: string): boolean {
  const text = `${fullName} ${description}`.toLowerCase()
  return /(^|[\s/_-])(dsh|dshub)([\s/_.-]|$)|deepseek[\s-]?harness|deepseek\s?harness/.test(text)
}

/* -------------------------------------------------------------------------- */
/* 合并                                                                        */
/* -------------------------------------------------------------------------- */

function loadCatalog(): CatalogFile {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as CatalogFile
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), plugins: [] }
  }
}

function normalizeLicense(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return /^(NOASSERTION|UNKNOWN|OTHER|NONE)$/i.test(value.trim()) ? undefined : value
}

function cleanDescription(text: string | null): string {
  if (!text) return ''
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/:\w+:/g, '')
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 240)
}

function tagsOf(meta: RepoMeta, seed: string[]): string[] {
  const topics = meta.repositoryTopics.nodes
    .map((n) => n.topic.name)
    .filter((t) => !/^(dsh-plugin|deepseek|deepseek-harness|dsh|harness|ai|plugin|plugins)$/.test(t))
  return [...new Set([...seed, ...topics])].slice(0, 12)
}

function upsert(
  catalog: CatalogFile,
  meta: RepoMeta,
  curated: {
    repo: string
    category?: CategoryId
    nameZh?: string
    name?: string
    desc?: string
    tags?: string[]
    featured?: number
    author?: string
  } | null,
  options: { now: string; source: 'group' | 'curated' | 'topic' }
): { plugin: Plugin; isNew: boolean } {
  const [owner, repo] = meta.nameWithOwner.split('/')
  const slug = meta.nameWithOwner.toLowerCase()
  const existing = catalog.plugins.find((p) => p.slug === slug)
  const description =
    curated?.desc?.trim() ||
    existing?.description ||
    cleanDescription(meta.description) ||
    `${owner}/${repo} · DeepSeek Harness 插件`

  const plugin: Plugin = {
    slug,
    name: curated?.name?.trim() || existing?.name || repo,
    nameZh: curated?.nameZh ?? existing?.nameZh,
    owner,
    repo,
    repoUrl: meta.url,
    homepage: meta.homepageUrl || undefined,
    description,
    category:
      curated?.category ??
      existing?.category ??
      inferCategory(repo, meta.description ?? '', meta.repositoryTopics.nodes.map((n) => n.topic.name)),
    tags: tagsOf(meta, [...(curated?.tags ?? []), ...(existing?.tags ?? [])]),
    install:
      existing?.install || `dsh plugin --profile web add github:${meta.nameWithOwner}`,
    version: meta.latestRelease?.tagName?.replace(/^v/, '') || existing?.version,
    license: normalizeLicense(meta.licenseInfo?.spdxId || meta.licenseInfo?.name) ?? existing?.license,
    language: meta.primaryLanguage?.name ?? existing?.language,
    stars: meta.stargazerCount,
    forks: meta.forkCount,
    openIssues: meta.issues?.totalCount,
    author: curated?.author ?? existing?.author,
    status: existing?.status ?? (owner === 'deepseek-ai' ? 'official' : 'listed'),
    source: existing?.source ?? options.source,
    featured: curated?.featured ? true : existing?.featured,
    featuredRank: curated?.featured ?? existing?.featuredRank,
    submittedBy: existing?.submittedBy,
    submitNote: existing?.submitNote,
    icon: existing?.icon,
    // 自动收录条目的「收录时间」用仓库最近提交时间近似，保证「最新上架」排序有意义；
    // 真正的提交条目保留真实提交时间。
    addedAt: existing?.addedAt ?? meta.pushedAt ?? options.now,
    pushedAt: meta.pushedAt ?? undefined,
    syncedAt: options.now,
  }
  return { plugin, isNew: !existing }
}

/* -------------------------------------------------------------------------- */
/* 主流程                                                                      */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const now = new Date().toISOString()
  const catalog = loadCatalog()
  const bySlug = new Map(catalog.plugins.map((p) => [p.slug, p]))

  const { CURATED } = await import('./curated.ts')
  const curatedByRepo = new Map<string, (typeof CURATED)[number]>(
    CURATED.map((c) => [c.repo.toLowerCase(), c])
  )

  const wanted = new Set<string>([...curatedByRepo.keys()])
  for (const p of catalog.plugins) wanted.add(p.slug)

  if (DISCOVER) {
    console.log('· 从 GitHub 话题发现新仓库…')
    const discovered = await discoverRepos()
    let added = 0
    for (const full of discovered) {
      const key = full.toLowerCase()
      if (wanted.has(key)) continue
      wanted.add(key)
      added += 1
    }
    console.log(`  话题命中 ${discovered.length} 个 DSH 相关仓库，其中 ${added} 个是新增`)
  }

  console.log(`· 拉取 ${wanted.size} 个仓库的元数据…`)
  const metas = await fetchRepos([...wanted])

  let created = 0
  let updated = 0
  const missing: string[] = []
  for (const key of wanted) {
    const meta = metas.get(key)
    if (!meta) {
      missing.push(key)
      continue
    }
    const curated = curatedByRepo.get(key) ?? null
    const { plugin, isNew } = upsert(catalog, meta, curated, {
      now,
      source: curated ? 'curated' : 'topic',
    })
    if (isNew) {
      catalog.plugins.push(plugin)
      created += 1
    } else {
      const index = catalog.plugins.findIndex((p) => p.slug === plugin.slug)
      catalog.plugins[index] = plugin
      updated += 1
    }
  }

  if (PRUNE && missing.length) {
    const drop = new Set(missing)
    catalog.plugins = catalog.plugins.filter((p) => !drop.has(p.slug))
    console.log(`· 已移除 ${missing.length} 个失效条目`)
  } else if (missing.length) {
    console.log(`· ${missing.length} 个仓库取不到元数据（保留原样，加 --prune 可移除）：`)
    console.log(`  ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`)
  }

  catalog.plugins.sort((a, b) => b.stars - a.stars)
  catalog.updatedAt = now
  catalog.version = catalog.version || 1

  const counts: Record<string, number> = {}
  for (const p of catalog.plugins) counts[p.category] = (counts[p.category] ?? 0) + 1
  const distribution = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join('  ')

  console.log('')
  console.log(`✓ 目录共 ${catalog.plugins.length} 个插件（新增 ${created}，更新 ${updated}）`)
  console.log(`  分类分布：${distribution}`)

  if (DRY) {
    console.log('（--dry，未写盘）')
    return
  }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${CATALOG_PATH}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(catalog, null, 2) + '\n')
  fs.renameSync(tmp, CATALOG_PATH)
  console.log(`  已写入 ${path.relative(ROOT, CATALOG_PATH)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
