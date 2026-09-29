/**
 * GitHub 只读访问
 *
 * - README 用 raw.githubusercontent 抓取，按 1 天缓存（ISR fetch cache）。
 * - 元数据（star / license / pushedAt）由 scripts/sync.ts 批量写入 data/plugins.json，
 *   页面渲染不直接打 GitHub API，避免被速率限制拖死。
 */

const README_CANDIDATES = [
  'README.md',
  'README.zh-CN.md',
  'README.zh.md',
  'readme.md',
  'Readme.md',
  'README.MD',
  'README.markdown',
]

export interface ReadmeResult {
  markdown: string
  path: string
}

export async function fetchReadme(owner: string, repo: string): Promise<ReadmeResult | null> {
  for (const file of README_CANDIDATES) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`
    try {
      const res = await fetch(url, {
        next: { revalidate: 86_400, tags: [`readme:${owner}/${repo}`] },
        headers: { 'user-agent': 'dshub' },
      })
      if (!res.ok) continue
      const text = await res.text()
      // 超过 400KB 的 README 截断，避免把整页撑爆
      return { markdown: text.slice(0, 400_000), path: file }
    } catch {
      continue
    }
  }
  return null
}

export interface RepoCheck {
  ok: boolean
  reason?: string
  data?: {
    fullName: string
    name: string
    owner: string
    description: string | null
    htmlUrl: string
    homepage: string | null
    stars: number
    forks: number
    openIssues: number
    license: string | null
    language: string | null
    pushedAt: string | null
    archived: boolean
    topics: string[]
    defaultBranch: string
  }
}

/** 提交表单用：实时校验一个仓库是否存在并抓回机器字段 */
export async function checkRepo(fullName: string): Promise<RepoCheck> {
  const token = process.env.GITHUB_TOKEN
  const url = `https://api.github.com/repos/${fullName}`
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dshub',
        ...(token ? { authorization: `bearer ${token}` } : {}),
      },
    })
    if (res.status === 404) return { ok: false, reason: '仓库不存在，或者不是公开仓库' }
    if (res.status === 403) return { ok: false, reason: 'GitHub 接口限流了，请稍后再试' }
    if (!res.ok) return { ok: false, reason: `GitHub 返回 ${res.status}` }
    const json = (await res.json()) as Record<string, unknown>
    if (json.archived === true) return { ok: false, reason: '仓库已归档，不再收录' }
    const owner = (json.owner as { login?: string } | undefined)?.login ?? ''
    const name = String(json.name ?? '')
    return {
      ok: true,
      data: {
        fullName: String(json.full_name ?? `${owner}/${name}`),
        name,
        owner,
        description: (json.description as string | null) ?? null,
        htmlUrl: String(json.html_url ?? `https://github.com/${owner}/${name}`),
        homepage: (json.homepage as string | null) || null,
        stars: Number(json.stargazers_count ?? 0),
        forks: Number(json.forks_count ?? 0),
        openIssues: Number(json.open_issues_count ?? 0),
        license:
          ((json.license as { spdx_id?: string } | null)?.spdx_id ?? null) === 'NOASSERTION'
            ? null
            : ((json.license as { spdx_id?: string } | null)?.spdx_id ?? null),
        language: (json.language as string | null) ?? null,
        pushedAt: (json.pushed_at as string | null) ?? null,
        archived: false,
        topics: Array.isArray(json.topics) ? (json.topics as string[]) : [],
        defaultBranch: String(json.default_branch ?? 'HEAD'),
      },
    }
  } catch {
    return { ok: false, reason: '连不上 GitHub，请检查网络或代理' }
  }
}
