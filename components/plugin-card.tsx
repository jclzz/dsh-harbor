import Link from 'next/link'
import { StarIcon } from '@/components/icons'
import { categoryLabel } from '@/lib/categories'
import { avatarChar, formatStars, gradientFor, initialsFor, licenseLabel } from '@/lib/format'
import type { Plugin } from '@/lib/types'

export function PluginCard({
  plugin,
  hot,
  hotLabel,
}: {
  plugin: Plugin
  hot?: boolean
  hotLabel?: string
}) {
  const subtitle = plugin.nameZh || categoryLabel(plugin.category)
  const author = plugin.author || plugin.owner

  return (
    <Link className={`card${hot ? ' hot' : ''}`} href={`/plugins/${plugin.slug}`}>
      {hot ? <span className="hot-tag">{hotLabel ?? 'HOT'}</span> : null}
      <div className="card-top">
        <span className="picon" aria-hidden="true">
          {initialsFor(plugin.name, plugin.icon)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="card-name">
            {plugin.name}
            {plugin.version ? <span className="ver">v{plugin.version.replace(/^v/, '')}</span> : null}
          </div>
          <div className="card-cn">{subtitle}</div>
        </div>
        <span className="tag">{categoryLabel(plugin.category)}</span>
      </div>
      <p className="card-desc">{plugin.description}</p>
      <div className="card-foot">
        <span className="avatar" style={{ background: gradientFor(plugin.owner) }}>
          {avatarChar(author)}
        </span>
        <span className="who">{author}</span>
        <span className="dl">
          <StarIcon />
          {formatStars(plugin.stars)}
        </span>
        {licenseLabel(plugin.license) ? (
          <>
            <span className="sep">·</span>
            <span className="src">{licenseLabel(plugin.license)}</span>
          </>
        ) : null}
      </div>
    </Link>
  )
}
