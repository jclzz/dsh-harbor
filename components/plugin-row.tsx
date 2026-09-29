import Link from 'next/link'
import { ChevronRight } from '@/components/icons'
import { categoryLabel } from '@/lib/categories'
import { avatarChar, gradientFor, initialsFor, relativeTime } from '@/lib/format'
import type { Plugin } from '@/lib/types'

/** 「最新上架」列表行 */
export function PluginRow({ plugin }: { plugin: Plugin }) {
  const author = plugin.author || plugin.owner
  return (
    <Link className="row" href={`/plugins/${plugin.slug}`}>
      <span className="picon" aria-hidden="true">
        {initialsFor(plugin.name, plugin.icon)}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row-name">
          {plugin.name}
          <span className="tag tag2">{categoryLabel(plugin.category)}</span>
        </div>
        <div className="row-desc">{plugin.description}</div>
      </div>
      <div className="row-meta">
        <span className="row-author">
          <span className="avatar" style={{ background: gradientFor(plugin.owner) }}>
            {avatarChar(author)}
          </span>
          {author}
        </span>
        <span className="row-time">{relativeTime(plugin.pushedAt ?? plugin.addedAt)}</span>
        <ChevronRight className="row-arrow" />
      </div>
    </Link>
  )
}
