/**
 * 插件港 DSH Harbor 数据模型
 *
 * 唯一真源：data/plugins.json
 * 人工整理的编辑字段（中文名、分类、一句话简介）与 GitHub 机器字段（star、
 * license、最近推送）分开：机器字段由 scripts/sync.ts 覆盖写入，编辑字段只由
 * 人/提交表单提供，sync 不会覆盖。
 */

export type CategoryId =
  | 'ui'
  | 'vision'
  | 'dev'
  | 'productivity'
  | 'memory'
  | 'automation'
  | 'search'
  | 'data'
  | 'integration'
  | 'fun'

/** listed  = 自动收录 / 提交后即时上架（未人工核验）
 *  verified = 人工核验过（仓库可访问、README 有安装命令、许可证存在）
 *  official = DeepSeek 官方仓库
 */
export type PluginStatus = 'listed' | 'verified' | 'official'

/** group   = 群友在提交页自己提交的
 *  curated = 维护者人工整理进精选清单的
 *  topic   = 从 GitHub `dsh-plugin` 话题自动收录
 */
export type PluginSource = 'group' | 'curated' | 'topic'

export interface Plugin {
  /** 唯一标识 = owner/repo 小写 */
  slug: string
  /** 展示名 */
  name: string
  /** 中文短名（卡片副标题），缺省时回退到分类名 */
  nameZh?: string
  owner: string
  repo: string
  repoUrl: string
  homepage?: string
  /** 一句话主描述 */
  description: string
  category: CategoryId
  tags: string[]
  /** 安装命令，默认 dsh plugin --profile web add github:owner/repo */
  install: string
  version?: string
  license?: string
  language?: string
  stars: number
  forks: number
  openIssues?: number
  /** 作者昵称（群友提交时填写），缺省时用 GitHub owner */
  author?: string
  status: PluginStatus
  source: PluginSource
  /** 是否本周精选 */
  featured?: boolean
  /** 精选排序，越小越靠前 */
  featuredRank?: number
  /** 群友提交者昵称 */
  submittedBy?: string
  /** 提交者留言 */
  submitNote?: string
  /** 图标：1-2 个字符，缺省取 name 首字母 */
  icon?: string
  /** 收录时间 */
  addedAt: string
  /** 仓库最近推送时间 */
  pushedAt?: string
  /** star 最后同步时间 */
  syncedAt?: string
}

export interface CatalogFile {
  version: number
  updatedAt: string
  plugins: Plugin[]
}

export interface CatalogStats {
  total: number
  authors: number
  stars: number
  addedThisWeek: number
  verified: number
  /** 群友在提交页提交的 */
  group: number
  /** 维护者人工整理进精选清单的 */
  curated: number
  perCategory: Record<CategoryId, number>
}
