import { allPlugins, comparator, readCatalog } from '@/lib/catalog'
import { SITE } from '@/lib/site'

/**
 * RSS：按「最近更新」排序的插件流。
 * 地址：/rss.xml
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

export async function GET() {
  const catalog = readCatalog()
  const plugins = [...allPlugins()].sort(comparator('updated')).slice(0, 80)
  const buildDate = new Date(catalog.updatedAt || Date.now()).toUTCString()

  const items = plugins
    .map((p) => {
      const url = `${SITE.url}/plugins/${p.slug}`
      const date = new Date(p.pushedAt ?? p.addedAt ?? Date.now()).toUTCString()
      return `    <item>
      <title>${escapeXml(p.name)}${p.nameZh ? ` · ${escapeXml(p.nameZh)}` : ''}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <category>${escapeXml(p.category)}</category>
      <description>${escapeXml(p.description)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} · 最新上架</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400',
    },
  })
}
