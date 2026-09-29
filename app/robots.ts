import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // 提交与预览接口不需要被爬
      { userAgent: '*', disallow: ['/api/'] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
