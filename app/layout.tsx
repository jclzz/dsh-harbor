import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { SITE } from '@/lib/site'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-var',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: '%s · DSHub',
  },
  description: SITE.description,
  keywords: [
    'DeepSeek Harness',
    'DSH',
    'DSH plugin',
    'dsh-plugin',
    '插件市场',
    '社区插件',
    'Cordis',
  ],
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: 'zh_CN',
  },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description },
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <div className="grid-bg" aria-hidden="true" />
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
