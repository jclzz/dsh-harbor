import Link from 'next/link'
import { BrandMark } from '@/components/icons'
import { allPlugins } from '@/lib/catalog'

export function SiteFooter() {
  const buildId = new Date().toISOString().slice(0, 10)
  let total = 0
  try {
    total = allPlugins().length
  } catch {
    total = 0
  }

  return (
    <footer>
      <div className="wrap">
        <div className="foot-main">
          <div className="foot-brand">
            <Link className="brand" href="/">
              <BrandMark />
              <span className="name">DSHub</span>
              <span className="pill">社区插件</span>
            </Link>
            <p>
              DeepSeek Harness 社区插件收录站。群友共建、来源可查、一键安装的非官方社区项目，
              与 DeepSeek 官方没有隶属关系。
            </p>
          </div>
          <div className="foot-col">
            <h4>导航</h4>
            <Link href="/plugins">插件库</Link>
            <Link href="/#categories">分类浏览</Link>
            <Link href="/plugins?sort=stars">Stars 排行</Link>
            <Link href="/plugins?sort=added">最新上架</Link>
          </div>
          <div className="foot-col">
            <h4>资源</h4>
            <Link href="/about">收录规范</Link>
            <Link href="/submit">提交插件</Link>
            <a href="/api/plugins" target="_blank" rel="noreferrer">
              JSON API
            </a>
            <a href="/rss.xml" target="_blank" rel="noreferrer">
              RSS 订阅
            </a>
          </div>
          <div className="foot-col">
            <h4>社区</h4>
            <a href="https://github.com/topics/dsh-plugin" target="_blank" rel="noreferrer">
              dsh-plugin 话题
            </a>
            <a href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noreferrer">
              Harness 仓库
            </a>
            <a href="https://deepseek.com/harness" target="_blank" rel="noreferrer">
              官方文档
            </a>
            <Link href="/about#contact">问题反馈</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} DSHub · 群友共建的非官方收录站，与 DeepSeek 官方无关</span>
          <span className="right">
            <span>build: {buildId}</span>
            <span>
              {total} plugins · made with ♥ by 群友们
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}
