import { NextResponse } from 'next/server'
import { CATEGORY_IDS, categoryLabel } from '@/lib/categories'
import { allPlugins, readCatalog, statsOf } from '@/lib/catalog'
import { defaultInstallCommand, licenseLabel } from '@/lib/format'

/**
 * GET /api/plugins —— 公开只读目录接口
 *
 * 给插件市场、CLI 或者别人的 bot 用。全量返回，字段和 data/plugins.json 一致，
 * 外加分类标签与统计，省得调用方自己维护一份分类表。
 */

export const revalidate = 300

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')?.toLowerCase()
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 0) || 0, 0), 5000)

  let plugins = allPlugins()
  if (category && CATEGORY_IDS.includes(category as never)) {
    plugins = plugins.filter((p) => p.category === category)
  }
  if (q) {
    plugins = plugins.filter((p) =>
      `${p.name} ${p.nameZh ?? ''} ${p.owner} ${p.repo} ${p.description} ${p.tags.join(' ')}`
        .toLowerCase()
        .includes(q)
    )
  }
  plugins = [...plugins].sort((a, b) => b.stars - a.stars)
  if (limit) plugins = plugins.slice(0, limit)

  const catalog = readCatalog()

  return NextResponse.json(
    {
      generatedAt: catalog.updatedAt,
      stats: statsOf(allPlugins()),
      categories: CATEGORY_IDS.map((id) => ({ id, label: categoryLabel(id) })),
      total: plugins.length,
      plugins: plugins.map((p) => ({
        slug: p.slug,
        name: p.name,
        nameZh: p.nameZh ?? null,
        owner: p.owner,
        repo: p.repo,
        repoUrl: p.repoUrl,
        homepage: p.homepage ?? null,
        description: p.description,
        category: p.category,
        categoryLabel: categoryLabel(p.category),
        tags: p.tags,
        install: p.install || defaultInstallCommand(p.owner, p.repo),
        version: p.version ?? null,
        license: licenseLabel(p.license) ?? null,
        language: p.language ?? null,
        stars: p.stars,
        forks: p.forks,
        author: p.author ?? p.owner,
        status: p.status,
        source: p.source,
        featured: Boolean(p.featured),
        addedAt: p.addedAt,
        pushedAt: p.pushedAt ?? null,
      })),
    },
    {
      headers: {
        'cache-control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
        'access-control-allow-origin': '*',
      },
    }
  )
}
