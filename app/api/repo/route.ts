import { NextResponse } from 'next/server'
import { findBySlug } from '@/lib/catalog'
import { checkRepo } from '@/lib/github'
import { parseRepoInput } from '@/lib/repo-input'

/**
 * GET /api/repo?full=owner/repo
 *
 * 提交表单用：粘贴仓库地址后即时回显名称、简介、Star、许可证，
 * 让用户在提交前就知道会被收录成什么样。只读，不写目录。
 */

const WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()

function limited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (list.length >= max) {
    hits.set(ip, list)
    return true
  }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) {
    for (const [key, value] of hits) if (!value.some((t) => now - t < windowMs)) hits.delete(key)
  }
  return false
}

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  if (limited(ip, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: '查询太频繁，稍等一下' }, { status: 429 })
  }

  const full = new URL(request.url).searchParams.get('full') ?? ''
  const parsed = parseRepoInput(full)
  if (!parsed) {
    return NextResponse.json({ ok: false, error: '仓库地址格式不对，例如 owner/repo' }, { status: 400 })
  }

  const existing = findBySlug(parsed.fullName.toLowerCase())
  if (existing) {
    return NextResponse.json({
      ok: true,
      exists: true,
      slug: existing.slug,
      url: `/plugins/${existing.slug}`,
      name: existing.name,
    })
  }

  const check = await checkRepo(parsed.fullName)
  if (!check.ok || !check.data) {
    return NextResponse.json({ ok: false, error: check.reason ?? '仓库校验失败' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, exists: false, repo: check.data })
}
