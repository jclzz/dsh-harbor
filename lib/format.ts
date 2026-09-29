/**
 * 纯展示辅助函数：不依赖 node:fs，客户端组件也能引用。
 */

/** 头像渐变板：社区人情味是设计里唯一的彩色区域 */
const GRADIENTS = [
  'linear-gradient(135deg,#4D6BFE,#36C6F0)',
  'linear-gradient(135deg,#7C5CFC,#C792EA)',
  'linear-gradient(135deg,#3DDC97,#36C6F0)',
  'linear-gradient(135deg,#FFB84D,#FF7A59)',
  'linear-gradient(135deg,#F472B6,#A58BFF)',
  'linear-gradient(135deg,#36C6F0,#4D6BFE)',
  'linear-gradient(135deg,#0EA5E9,#3DDC97)',
  'linear-gradient(135deg,#D97706,#F472B6)',
  'linear-gradient(135deg,#4D6BFE,#7C5CFC)',
  'linear-gradient(135deg,#22D3EE,#818CF8)',
]

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function gradientFor(seed: string): string {
  return GRADIENTS[hash(seed) % GRADIENTS.length]
}

/** 取 1 个字符做小头像：中文取首字，英文取首字母大写 */
export function avatarChar(seed: string): string {
  const s = seed.trim()
  if (!s) return '?'
  const first = s[0]
  if (/[\u4e00-\u9fa5]/.test(first)) return first
  return first.toUpperCase()
}

/** 插件图标：中文取前两字，英文取首字母缩写 */
export function initialsFor(name: string, icon?: string): string {
  const source = icon?.trim() || name.trim()
  if (!source) return '?'
  if (/[\u4e00-\u9fa5]/.test(source[0])) return source.slice(0, 2)
  const words = source.replace(/^dsh[-_]/i, '').split(/[\s\-_.]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return source.replace(/^dsh[-_]/i, '').slice(0, 2).toUpperCase() || source.slice(0, 2).toUpperCase()
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    const k = stars / 1000
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(stars)
}

/** GitHub 把识别不出的许可证标成 NOASSERTION，展示时当作未知处理 */
export function licenseLabel(license: string | undefined | null): string | undefined {
  if (!license) return undefined
  if (/^(NOASSERTION|UNKNOWN|OTHER|NONE|-)$/i.test(license.trim())) return undefined
  return license
}

function ts(value: string | undefined): number {
  const t = value ? Date.parse(value) : 0
  return Number.isFinite(t) ? t : 0
}

export function relativeTime(iso: string | undefined, now = Date.now()): string {
  const t = ts(iso)
  if (!t) return '—'
  const diff = now - t
  if (diff < 0) return '刚刚'
  const min = Math.floor(diff / 60_000)
  if (min < 60) return min <= 1 ? '刚刚' : `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月前`
  return `${Math.floor(month / 12)} 年前`
}

export function formatDate(iso: string | undefined): string {
  const t = ts(iso)
  if (!t) return '—'
  return new Date(t).toISOString().slice(0, 10)
}

export function defaultInstallCommand(owner: string, repo: string): string {
  return `dsh plugin --profile web add github:${owner}/${repo}`
}
