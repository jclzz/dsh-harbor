import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { inferCategory, isCategoryId } from '@/lib/categories'
import { defaultInstallCommand, findBySlug, mutateCatalog } from '@/lib/catalog'
import { checkRepo } from '@/lib/github'
import { parseRepoInput, pickTags } from '@/lib/repo-input'
import type { CategoryId, Plugin } from '@/lib/types'

/**
 * POST /api/submit —— 提交插件
 *
 * 刻意不做人工审核：校验通过即上架（status: 'listed'），靠 GitHub 仓库本身当背书，
 * 页面上标注「未核验」，让读者自己看源码。
 *
 * 校验顺序是刻意的（贵的东西放最后）：
 *   ① 蜜罐 → ② 仓库地址格式 → ③ 本地字段（简介/分类/确认）
 *   → ④ 本地目录去重（不打 GitHub）→ ⑤ 限流 → ⑥ 才调 GitHub API → ⑦ 写盘
 * 这样写错字、点错分类都不会消耗配额，配额只用来保护 GitHub API。
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = Number(process.env.DSHUB_SUBMIT_PER_HOUR ?? 8)

const hits = new Map<string, number[]>()

/**
 * 取客户端 IP。
 * 直接暴露在公网时 X-Forwarded-For 可以被伪造，所以取**最后一个**地址
 * （反向代理会把它自己看到的对端 IP 追加在末尾）。
 * 约定：前面有且只有一层可信代理（Caddy / Nginx / 容器网关）。
 */
function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return request.headers.get('x-real-ip')?.trim() || 'local'
}

function quotaOf(ip: string, now = Date.now()): number[] {
  return (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
}

function isRateLimited(ip: string): boolean {
  return quotaOf(ip).length >= MAX_PER_WINDOW
}

function consumeQuota(ip: string): void {
  const now = Date.now()
  const list = quotaOf(ip, now)
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) {
    for (const [key, value] of hits) if (!value.some((t) => now - t < WINDOW_MS)) hits.delete(key)
  }
}

function bad(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
}

export async function GET() {
  // 给前端做剩余配额提示用
  return NextResponse.json({ ok: true, perHour: MAX_PER_WINDOW })
}

export async function POST(request: Request) {
  const ip = clientIp(request)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return bad('请求格式不对')
  }

  /* ① 蜜罐：正常用户看不到这个字段，填了就当作机器人静默丢弃 */
  if (clean(body.website, 100)) return NextResponse.json({ ok: true, ignored: true })

  /* ② 仓库地址 */
  const parsed = parseRepoInput(clean(body.repo, 200))
  if (!parsed) {
    return bad('请填写正确的 GitHub 仓库地址，例如 owner/repo 或 https://github.com/owner/repo')
  }

  /* ③ 本地字段校验 */
  const description = clean(body.description, 240)
  if (description.length < 6) return bad('一句话简介太短了，至少写 6 个字')

  const rawCategory = clean(body.category, 20)
  if (!isCategoryId(rawCategory)) return bad('请选择一个分类')
  const category: CategoryId = rawCategory

  if (body.agree !== true && body.agree !== 'true' && body.agree !== 1) {
    return bad('请先确认仓库公开、README 有安装命令、且声明了许可证')
  }

  /* ④ 本地去重：这一步不打 GitHub，也不消耗配额 */
  const existing = findBySlug(parsed.fullName.toLowerCase())
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: `${parsed.fullName} 已经在收录列表里了`,
        existing: { slug: existing.slug, url: `/plugins/${existing.slug}` },
      },
      { status: 409 }
    )
  }

  /* ⑤ 限流：只挡真正要打 GitHub 的请求 */
  if (isRateLimited(ip)) {
    return bad(
      `提交太频繁了，休息一会儿再试（同一 IP 每小时最多 ${MAX_PER_WINDOW} 次）`,
      429
    )
  }
  consumeQuota(ip)

  /* ⑥ 实时读 GitHub */
  const check = await checkRepo(parsed.fullName)
  if (!check.ok || !check.data) {
    return bad(check.reason ?? '仓库校验失败', check.reason?.includes('限流') ? 429 : 400)
  }
  const repo = check.data

  /* 许可证是硬要求：没许可证等于没授权别人使用（可用 DSHUB_REQUIRE_LICENSE=false 放宽） */
  const requireLicense = process.env.DSHUB_REQUIRE_LICENSE !== 'false'
  if (requireLicense && !repo.license) {
    return bad(
      `${repo.fullName} 没有声明开源许可证。请在仓库里加一个 LICENSE 文件（MIT / Apache-2.0 等）后再提交。`,
      400
    )
  }

  /* ⑦ 写盘 */
  const name = clean(body.name, 60) || repo.name
  const nameZh = clean(body.nameZh, 30)
  const author = clean(body.author, 40)
  const submittedBy = clean(body.submittedBy, 40)
  const submitNote = clean(body.note, 300)
  const extraTags = clean(body.tags, 160)
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const now = new Date().toISOString()

  const plugin: Plugin = {
    slug: repo.fullName.toLowerCase(),
    name,
    nameZh: nameZh || undefined,
    owner: repo.owner,
    repo: repo.name,
    repoUrl: repo.htmlUrl,
    homepage: repo.homepage || undefined,
    description: description || repo.description || `${repo.fullName} · DeepSeek Harness 插件`,
    category: category ?? inferCategory(repo.name, repo.description ?? '', repo.topics),
    tags: pickTags(repo.topics, extraTags),
    install: defaultInstallCommand(repo.owner, repo.name),
    license: repo.license ?? undefined,
    language: repo.language ?? undefined,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    author: author || undefined,
    status: 'listed',
    source: 'group',
    submittedBy: submittedBy || undefined,
    submitNote: submitNote || undefined,
    addedAt: now,
    pushedAt: repo.pushedAt ?? undefined,
    syncedAt: now,
  }

  const written = await mutateCatalog((data) => {
    // 并发提交同一仓库时，后一个直接认输，不写重复条目
    if (data.plugins.some((p) => p.slug === plugin.slug)) return false
    data.plugins.push(plugin)
    data.version = data.version || 1
    return true
  })

  if (!written) {
    return NextResponse.json(
      {
        ok: false,
        error: `${plugin.slug} 刚刚被提交过了`,
        existing: { slug: plugin.slug, url: `/plugins/${plugin.slug}` },
      },
      { status: 409 }
    )
  }

  revalidatePath('/')
  revalidatePath('/plugins')
  revalidatePath(`/plugins/${plugin.slug}`)

  return NextResponse.json({
    ok: true,
    slug: plugin.slug,
    url: `/plugins/${plugin.slug}`,
    name: plugin.name,
  })
}
