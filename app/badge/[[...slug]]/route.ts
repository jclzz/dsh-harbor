import { findBySlug, formatStars } from '@/lib/catalog'

/**
 * GET /badge/<owner>/<repo>.svg —— README 徽章
 *
 * 单色胶囊，跟站点视觉一致；右半边的 Star 数跟着目录同步刷新，
 * 所以 README 里的徽章不用手动改数字。
 * 缓存 1 小时 / CDN 6 小时，避免每次读 README 都打回源。
 */

export const revalidate = 600

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 粗略估宽：CJK 记 2 个单位，ASCII 记 1 个（字号 11 时约 6.6px/单位） */
function textWidth(text: string, size: number): number {
  let units = 0
  for (const char of text) {
    units += /[\u2e80-\u9fff\uff00-\uffef]/.test(char) ? 2 : 1
  }
  return Math.ceil(units * size * 0.6)
}

function badgeSvg(left: string, right: string, accent: boolean): string {
  const size = 11
  const padX = 10
  const dot = 11
  const leftW = textWidth(left, size) + padX * 2 + dot - padX
  const rightW = textWidth(right, size) + padX * 2
  const total = leftW + rightW
  const h = 24
  const label = escapeXml(left)
  const value = escapeXml(right)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${h}" viewBox="0 0 ${total} ${h}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <rect width="${total}" height="${h}" rx="6" fill="#0C0C0E"/>
  <rect x="0.5" y="0.5" width="${total - 1}" height="${h - 1}" rx="5.5" fill="none" stroke="rgba(255,255,255,0.14)"/>
  <circle cx="${padX}" cy="${h / 2}" r="3" fill="${accent ? '#4D6BFE' : '#7A7A80'}"/>
  <text x="${padX + dot}" y="${h / 2 + 4}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif" font-size="${size}" font-weight="600" fill="#FFFFFF">${label}</text>
  <line x1="${leftW}" y1="4" x2="${leftW}" y2="${h - 4}" stroke="rgba(255,255,255,0.14)"/>
  <text x="${leftW + padX}" y="${h / 2 + 4}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${size}" font-weight="500" fill="#A1A1A6">${value}</text>
</svg>
`
}

function respond(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
    },
  })
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  const raw = (slug ?? []).join('/')
  if (!raw) return respond(badgeSvg('插件港', '未知插件', false), 404)

  const full = raw.replace(/\.svg$/i, '')
  const plugin = findBySlug(full)
  if (!plugin) return respond(badgeSvg('插件港', '未收录', false), 404)

  const label = plugin.name.length > 22 ? `${plugin.name.slice(0, 21)}…` : plugin.name
  return respond(badgeSvg(label, `★ ${formatStars(plugin.stars)}`, plugin.status !== 'listed'))
}
