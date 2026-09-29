/**
 * 仓库地址解析：表单里用户可能粘贴各种形态，统一归一成 owner/repo。
 * 客户端与服务端共用（不依赖 node）。
 */

const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})'
const REPO = '[A-Za-z0-9._-]{1,100}'

const PATTERNS = [
  // dsh plugin --profile web add github:owner/repo
  new RegExp(`github:(${OWNER})/(${REPO})`, 'i'),
  // https://github.com/owner/repo(.git)(/tree/...)  |  git@github.com:owner/repo.git
  new RegExp(`github\\.com[:/](${OWNER})/(${REPO}?)(?:\\.git)?(?:[/#?].*)?$`, 'i'),
  // 裸 owner/repo
  new RegExp(`^(${OWNER})/(${REPO})$`),
]

export interface ParsedRepo {
  owner: string
  repo: string
  fullName: string
}

export function parseRepoInput(input: string): ParsedRepo | null {
  const value = input.trim()
  if (!value) return null
  for (const pattern of PATTERNS) {
    const match = value.match(pattern)
    if (!match) continue
    const owner = match[1]
    let repo = match[2]
    if (!owner || !repo) continue
    repo = repo.replace(/\.git$/i, '').replace(/[.,;)\]]+$/, '')
    if (!/^[A-Za-z0-9._-]+$/.test(repo)) continue
    if (/^(tree|blob|issues|pulls|releases|actions|wiki|commit)$/i.test(repo)) continue
    return { owner, repo, fullName: `${owner}/${repo}` }
  }
  return null
}

export function isValidGitHubUrl(input: string): boolean {
  return parseRepoInput(input) !== null
}

const RESERVED_TOPICS = /^(dsh-plugin|deepseek-harness|dsh)$/i

/** 从仓库 topics 里挑出适合当站内标签的：丢掉话题本身和过泛的标签 */
export function pickTags(topics: string[], extra: string[] = [], limit = 8): string[] {
  const out: string[] = []
  for (const tag of [...extra, ...topics]) {
    const value = tag.trim().toLowerCase()
    if (!value || value.length > 24) continue
    if (RESERVED_TOPICS.test(value)) continue
    if (out.includes(value)) continue
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}
