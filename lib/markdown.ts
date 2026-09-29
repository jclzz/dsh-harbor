import { Marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * README 渲染器
 *
 * README 是第三方内容，用 marked 解析后交给 sanitize-html 走白名单过滤：
 * 只保留常见排版标签（标题、段落、列表、代码块、表格、图片、折叠块…），
 * 脚本、样式、事件属性、iframe、表单一律丢掉，链接协议限制在 http/https/mailto。
 * 仓库内的相对路径（图片、文档）会被改写成 GitHub / raw.githubusercontent 的绝对地址，
 * 否则渲染出来全是 404。
 */

const marked = new Marked({ gfm: true, breaks: false, pedantic: false })

export interface RenderOptions {
  owner: string
  repo: string
  /** 用于把相对链接指向具体分支；默认 HEAD */
  branch?: string
}

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'del', 's', 'ins', 'mark', 'sub', 'sup', 'small', 'kbd',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'details', 'summary',
  'div', 'span', 'figure', 'figcaption', 'picture', 'source',
]

const ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'name', 'id'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
  source: ['srcset', 'src', 'type', 'media'],
  td: ['align', 'colspan', 'rowspan'],
  th: ['align', 'colspan', 'rowspan'],
  div: ['align'],
  p: ['align'],
  h1: ['align'],
  h2: ['align'],
  h3: ['align'],
  code: ['class'],
  pre: ['class'],
  details: ['open'],
  '*': ['id'],
}

function isAbsolute(url: string): boolean {
  return /^(https?:)?\/\//i.test(url) || url.startsWith('data:image/') || url.startsWith('#') || url.startsWith('mailto:')
}

export function renderReadme(markdown: string, { owner, repo, branch = 'HEAD' }: RenderOptions): string {
  const raw = marked.parse(stripBadgeNoise(markdown)) as string

  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: true,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = normaliseRef(attribs.href, owner, repo, branch, 'blob')
        const next: Record<string, string> = { ...attribs }
        if (href) next.href = href
        else delete next.href
        if (href && /^https?:\/\//i.test(href)) {
          next.target = '_blank'
          next.rel = 'noreferrer nofollow'
        }
        return { tagName, attribs: next }
      },
      img: (tagName, attribs) => {
        const src = normaliseRef(attribs.src, owner, repo, branch, 'raw')
        const next: Record<string, string> = { ...attribs, loading: 'lazy' }
        if (src) next.src = src
        else return { tagName: 'span', attribs: {} }
        return { tagName, attribs: next }
      },
      source: (tagName, attribs) => {
        const srcset = attribs.srcset
          ? attribs.srcset
              .split(',')
              .map((part) => {
                const [url, ...rest] = part.trim().split(/\s+/)
                const fixed = normaliseRef(url, owner, repo, branch, 'raw')
                return fixed ? [fixed, ...rest].join(' ') : ''
              })
              .filter(Boolean)
              .join(', ')
          : undefined
        const next: Record<string, string> = { ...attribs }
        if (srcset) next.srcset = srcset
        else delete next.srcset
        delete next.src
        return { tagName, attribs: next }
      },
    },
  })
}

/** 把仓库内相对路径改成 GitHub 绝对地址 */
function normaliseRef(
  value: string | undefined,
  owner: string,
  repo: string,
  branch: string,
  mode: 'blob' | 'raw'
): string | undefined {
  if (!value) return undefined
  const url = value.trim()
  if (!url) return undefined
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    // 有协议：只放行 http(s)/mailto/data:image
    if (/^(https?|mailto):/i.test(url)) return url
    if (/^data:image\//i.test(url)) return url
    return undefined
  }
  if (url.startsWith('#')) return url
  const clean = url.replace(/^\.?\//, '')
  const host =
    mode === 'raw'
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`
      : `https://github.com/${owner}/${repo}/blob/${branch}`
  return `${host}/${clean}`
}

/** 去掉顶部一排 CI badge（指向别人的流水线，读起来全是噪音） */
function stripBadgeNoise(markdown: string): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  let seenContent = false
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()
    const badgeCount = (trimmed.match(/\[!\[/g) ?? []).length
    if (!seenContent && badgeCount >= 2) continue
    if (!seenContent && /^ {0,3}<(p|div)\b[^>]*align="center"/i.test(trimmed) && i + 1 < lines.length && /\[!\[/.test(lines[i + 1] ?? '')) {
      continue
    }
    if (trimmed !== '') seenContent = true
    out.push(line)
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
