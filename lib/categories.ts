import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  /** 卡片副标题回退文案 / 分类页说明 */
  desc: string
  /** 图标：light 细线风格 SVG path（24x24 viewBox） */
  icon: string
}

/**
 * 分类顺序即首页 chips 与分类页的顺序。
 * 保持 10 个以内，让 chips 行在 1440 视口下一行放得下。
 */
export const CATEGORIES: Category[] = [
  {
    id: 'ui',
    label: '界面',
    desc: '侧边栏、皮肤主题、桌面端与 Web UI 增强',
    icon: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM3 8.5h18',
  },
  {
    id: 'vision',
    label: '视觉',
    desc: '给纯文本模型装上眼睛：OCR、截图理解、UI 还原',
    icon: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  },
  {
    id: 'dev',
    label: '开发',
    desc: '代码、终端、Git 与工程协作',
    icon: 'm8 6-6 6 6 6M16 6l6 6-6 6',
  },
  {
    id: 'productivity',
    label: '效率',
    desc: '文档、笔记、任务与办公流',
    icon: 'M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5zM14 2v5h5',
  },
  {
    id: 'memory',
    label: '记忆',
    desc: '跨会话记忆、上下文压缩与知识沉淀',
    icon: 'M4 5.5C4 4.1 7.6 3 12 3s8 1.1 8 2.5S16.4 8 12 8 4 6.9 4 5.5zM4 5.5V12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5.5M4 12v6.5C4 19.9 7.6 21 12 21s8-1.1 8-2.5V12',
  },
  {
    id: 'automation',
    label: '自动化',
    desc: '工作流、子智能体、定时与批量任务',
    icon: 'M6 3v3.5M18 3v3.5M6 17.5V21M18 17.5V21M3 6.5h18v11H3zM8 11h8M8 14h4',
  },
  {
    id: 'search',
    label: '搜索',
    desc: '联网检索、信息聚合与研究',
    icon: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  },
  {
    id: 'data',
    label: '数据',
    desc: '数据库、表格、图表与行情',
    icon: 'M3 17.5 8.5 12l4 4L21 7M16 7h5v5',
  },
  {
    id: 'integration',
    label: '集成',
    desc: 'IM、MCP、模型供应商与外部系统打通',
    icon: 'M6 6a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 6 6zM18 23a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 18 23zM6 8.6v6.4c0 4.5 4 5.4 8 5.4M18 15.4V8.2',
  },
  {
    id: 'fun',
    label: '娱乐',
    desc: '桌宠、皮肤、小游戏与整活',
    icon: 'M12 2.5 14.6 9l6.9.3-5.4 4.4 1.8 6.8L12 16.7 6.1 20.5l1.8-6.8L2.5 9.3 9.4 9 12 2.5z',
  },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoryLabel(id: CategoryId | string | undefined): string {
  if (!id) return '未分类'
  return BY_ID.get(id as CategoryId)?.label ?? '未分类'
}

export function categoryDesc(id: CategoryId | string): string {
  return BY_ID.get(id as CategoryId)?.desc ?? ''
}

export function categoryIcon(id: CategoryId | string): string {
  return (
    BY_ID.get(id as CategoryId)?.icon ??
    'M12 3.5 20.5 8v8L12 20.5 3.5 16V8L12 3.5z'
  )
}

export function isCategoryId(value: string | undefined | null): value is CategoryId {
  return !!value && BY_ID.has(value as CategoryId)
}

/**
 * 从仓库名 / description / topics 推断分类。
 * 命中优先级：越具体的信号越靠前，最后回退 productivity。
 */
const RULES: Array<{ id: CategoryId; patterns: RegExp }> = [
  {
    id: 'fun',
    patterns:
      /(桌宠|皮肤|主题|壁纸|幼女|宠物|表情包|斗图|galgame|gal-view|酒馆|跑团|游戏|小游戏|桌宠|玩偶|meme|pet|skin|wallpaper|tavern|roleplay|game|anime|wife|girlfriend|whale-girl)/i,
  },
  {
    id: 'vision',
    patterns:
      /(视觉|看图|图片|图像|截图|ocr|识图|多模态|画图|drawing|vision|image|screenshot|multimodal|gui-?automation)/i,
  },
  {
    id: 'memory',
    patterns:
      /(记忆|上下文|召回|知识图谱|遗忘|memory|context|recall|mnem|engram|everos|knowledge\s*graph)/i,
  },
  {
    id: 'search',
    patterns: /(搜索|检索|联网|search|retrieval|web-?search|serp|research|tavily|anysearch)/i,
  },
  {
    id: 'integration',
    patterns:
      /(接入|供应商|模型路由|网关|隧道|机器人|飞书|钉钉|微信|企业微信|qq|slack|telegram|discord|whatsapp|im-|bridge|provider|gateway|mcp|oauth|subscription)/i,
  },
  {
    id: 'automation',
    patterns:
      /(工作流|自动化|定时|编排|子代理|多智能体|团队|调度|workflow|automat|schedul|agent-?team|orchestrat|subagent|council|pipeline|task-?queue)/i,
  },
  {
    id: 'data',
    patterns:
      /(数据库|行情|股票|图表|表格|报表|数据|可视化|database|sql|chart|dashboard|spreadsheet|trading|stock|market|stats|usage|billing|cost|ledger|insight)/i,
  },
  {
    id: 'ui',
    patterns:
      /(桌面|客户端|界面|侧边栏|皮肤|启动器|主题|窗口|终端 ui|desktop|client|sidebar|launcher|electron|tauri|tui|web-?ui|shell|hud|panel|dock)/i,
  },
  {
    id: 'dev',
    patterns:
      /(开发|调试|代码|终端|git|仓库|构建|测试|审计|安全|渗透|红队|cli|dev|debug|code|terminal|repo|build|test|lint|audit|security|pentest|sandbox|reverse)/i,
  },
  {
    id: 'productivity',
    patterns:
      /(笔记|文档|写作|论文|小说|ppt|office|便签|任务|待办|效率|note|doc|writ|paper|novel|task|todo|knowledge|office|research)/i,
  },
]

export function inferCategory(...signals: Array<string | string[] | undefined>): CategoryId {
  const hay = signals
    .flatMap((s) => (Array.isArray(s) ? s : [s ?? '']))
    .join(' ')
    .toLowerCase()
  for (const rule of RULES) {
    if (rule.patterns.test(hay)) return rule.id
  }
  return 'productivity'
}
