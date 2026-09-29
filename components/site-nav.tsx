'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandMark, GithubIcon } from '@/components/icons'

const LINKS = [
  { href: '/plugins', label: '插件库' },
  { href: '/#categories', label: '分类' },
  { href: '/#featured', label: '精选' },
  { href: '/about', label: '关于' },
]

const REPO = 'https://github.com/deepseek-ai/deepseek-harness'

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav className="site-nav">
      <div className="wrap">
        <Link className="brand" href="/">
          <BrandMark />
          <span className="name">DSHub</span>
          <span className="pill">社区插件</span>
        </Link>

        <div className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-active={pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <a className="gh" href={REPO} target="_blank" rel="noreferrer" aria-label="Harness 官方仓库">
            <GithubIcon />
          </a>
          <Link className="btn btn-primary" href="/submit">
            提交插件
          </Link>
        </div>
      </div>
    </nav>
  )
}
