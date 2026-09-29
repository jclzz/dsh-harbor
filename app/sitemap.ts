import type { MetadataRoute } from 'next'
import { allPlugins, comparator } from '@/lib/catalog'
import { CATEGORIES } from '@/lib/categories'
import { SITE } from '@/lib/site'

export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/plugins`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE.url}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  for (const category of CATEGORIES) {
    entries.push({
      url: `${SITE.url}/plugins?category=${category.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const plugin of [...allPlugins()].sort(comparator('stars'))) {
    entries.push({
      url: `${SITE.url}/plugins/${plugin.slug}`,
      lastModified: new Date(plugin.pushedAt ?? plugin.addedAt),
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  }

  return entries
}
