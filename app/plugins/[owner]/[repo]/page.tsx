import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, GithubIcon } from '@/components/icons'
import { CopyButton } from '@/components/copy-button'
import { PluginCard } from '@/components/plugin-card'
import { categoryLabel } from '@/lib/categories'
import {
  allPlugins,
  findByOwnerRepo,
  formatStars,
  initialsFor,
  licenseLabel,
  relativeTime,
} from '@/lib/catalog'
import { fetchReadme } from '@/lib/github'
import { renderReadme } from '@/lib/markdown'
import { SITE } from '@/lib/site'

export const revalidate = 300
export const dynamicParams = true

type Params = Promise<{ owner: string; repo: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { owner, repo } = await params
  const plugin = findByOwnerRepo(owner, repo)
  if (!plugin) return { title: '插件不存在' }
  const title = `${plugin.name} · ${categoryLabel(plugin.category)}插件`
  const description = plugin.description.slice(0, 150)
  return {
    title,
    description,
    alternates: { canonical: `/plugins/${plugin.slug}` },
    openGraph: { title, description, type: 'article' },
  }
}

export default async function PluginDetailPage({ params }: { params: Params }) {
  const { owner, repo } = await params
  const plugin = findByOwnerRepo(owner, repo)
  if (!plugin) notFound()

  const author = plugin.author || plugin.owner
  const readme = await fetchReadme(plugin.owner, plugin.repo)
  const html = readme
    ? renderReadme(readme.markdown, { owner: plugin.owner, repo: plugin.repo })
    : null

  const related = allPlugins()
    .filter((p) => p.category === plugin.category && p.slug !== plugin.slug)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: plugin.name,
    description: plugin.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Windows, Linux',
    softwareVersion: plugin.version,
    url: `${SITE.url}/plugins/${plugin.slug}`,
    codeRepository: plugin.repoUrl,
    author: { '@type': 'Person', name: author, url: `https://github.com/${plugin.owner}` },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    license: plugin.license,
    datePublished: plugin.addedAt,
    dateModified: plugin.pushedAt,
  }

  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        // JSON-LD 里只有我们自己的字段
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="detail-head">
        <nav className="breadcrumb">
          <Link href="/">首页</Link>
          <ChevronRight size={12} />
          <Link href="/plugins">插件库</Link>
          <ChevronRight size={12} />
          <Link href={`/plugins?category=${plugin.category}`}>{categoryLabel(plugin.category)}</Link>
        </nav>

        <div className="detail-top">
          <span className="picon mono" aria-hidden="true">
            {initialsFor(plugin.name, plugin.icon)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 className="detail-title">
              {plugin.name}
              {plugin.version ? <span className="ver">v{plugin.version.replace(/^v/, '')}</span> : null}
            </h1>
            <p className="detail-owner">
              <a href={plugin.repoUrl} target="_blank" rel="noreferrer">
                {plugin.owner}/{plugin.repo}
              </a>
              {plugin.language ? <span> · {plugin.language}</span> : null}
              {licenseLabel(plugin.license) ? <span> · {licenseLabel(plugin.license)}</span> : null}
            </p>
          </div>
        </div>

        <p className="detail-desc">{plugin.description}</p>

        <div className="detail-tags">
          <span className="badge">{categoryLabel(plugin.category)}</span>
          {plugin.status === 'verified' ? <span className="badge ok">已核验</span> : null}
          {plugin.status === 'official' ? <span className="badge ok">官方</span> : null}
          {plugin.source === 'group' ? <span className="badge new">群友提交</span> : null}
          {plugin.source === 'curated' ? <span className="badge">精选收录</span> : null}
          {plugin.tags.slice(0, 6).map((tag) => (
            <Link className="badge" key={tag} href={`/plugins?q=${encodeURIComponent(tag)}`}>
              #{tag}
            </Link>
          ))}
        </div>

        <div className="detail-actions">
          <a className="btn btn-primary btn-lg" href={plugin.repoUrl} target="_blank" rel="noreferrer">
            <GithubIcon size={15} />
            查看仓库
          </a>
          {plugin.homepage ? (
            <a className="btn btn-ghost btn-lg" href={plugin.homepage} target="_blank" rel="noreferrer">
              官网
            </a>
          ) : null}
          <CopyButton
            className="btn btn-ghost btn-lg"
            value={plugin.install}
            label="复制安装命令"
            doneLabel="已复制"
          />
        </div>
      </header>

      <div className="detail-body">
        <div style={{ minWidth: 0 }}>
          <div className="block-title">
            <i />
            INSTALL
          </div>
          <div className="install-box">
            <span className="ps">$</span>
            <code>
              dsh plugin --profile web add <span className="blue">github:{plugin.slug}</span>
            </code>
            <CopyButton value={plugin.install} className="ic-copy" />
          </div>
          <p className="ic-note" style={{ marginTop: 12 }}>
            需要 DeepSeek Harness <span className="mono">&gt;= 0.9.0</span>。装完重启{' '}
            <span className="mono">dsh web</span>，插件由 Cordis 内核挂载；不想要了执行{' '}
            <span className="mono">dsh plugin --profile web remove github:{plugin.slug}</span>。
          </p>

          <div className="detail-section">
            <div className="block-title">
              <i />
              README
            </div>
            {html ? (
              <article
                className="readme"
                // 内容已经在 lib/markdown.ts 里转义过原始 HTML 并做了协议白名单
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="readme">
                <p className="readme-note">
                  没能抓到 README（可能文件名不是 README.md，或者临时网络问题）。
                  以仓库里的文档为准：
                  <a href={plugin.repoUrl} target="_blank" rel="noreferrer">
                    {plugin.repoUrl}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="meta-card">
            <div className="meta-stats">
              <div>
                <div className="n">{formatStars(plugin.stars)}</div>
                <div className="l">GitHub Stars</div>
              </div>
              <div>
                <div className="n">{formatStars(plugin.forks)}</div>
                <div className="l">Forks</div>
              </div>
            </div>

            <h3>仓库信息</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">分类</span>
                <span className="v">{categoryLabel(plugin.category)}</span>
              </div>
              <div className="meta-item">
                <span className="k">作者</span>
                <span className="v">
                  <a href={`https://github.com/${plugin.owner}`} target="_blank" rel="noreferrer">
                    {author}
                  </a>
                </span>
              </div>
              <div className="meta-item">
                <span className="k">许可证</span>
                <span className="v">{licenseLabel(plugin.license) ?? '未声明'}</span>
              </div>
              <div className="meta-item">
                <span className="k">语言</span>
                <span className="v">{plugin.language ?? '—'}</span>
              </div>
              {plugin.openIssues !== undefined ? (
                <div className="meta-item">
                  <span className="k">开放 Issue</span>
                  <span className="v">{plugin.openIssues}</span>
                </div>
              ) : null}
              <div className="meta-item">
                <span className="k">仓库更新</span>
                <span className="v">{relativeTime(plugin.pushedAt)}</span>
              </div>
              <div className="meta-item">
                <span className="k">收录时间</span>
                <span className="v">{relativeTime(plugin.addedAt)}</span>
              </div>
              <div className="meta-item">
                <span className="k">来源</span>
                <span className="v">
                  {plugin.source === 'group'
                    ? '群友提交'
                    : plugin.source === 'curated'
                      ? '人工精选'
                      : '话题自动收录'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-2)' }}>
                README 徽章
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8, marginBottom: 12 }}>
                贴到你的 README，Star 数会跟着目录同步自动更新。
              </p>
              <CopyButton
                className="ic-copy"
                label="复制 Markdown"
                doneLabel="已复制"
                value={`[![DSH Harbor](<SITE>/badge/${plugin.slug}.svg)](<SITE>/plugins/${plugin.slug})`.replace(
                  /<SITE>/g,
                  SITE.url
                )}
              />
            </div>
          </div>

          {plugin.submitNote ? (
            <div className="side-note" style={{ marginTop: 20 }}>
              <h3>提交者留言</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9 }}>
                {plugin.submitNote}
              </p>
              {plugin.submittedBy ? (
                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                  —— {plugin.submittedBy}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="side-note" style={{ marginTop: 20 }}>
            <h3>安装前请自查</h3>
            <ul>
              <li>仓库是否公开、最近还有提交</li>
              <li>README 里是否写清插件申请了哪些权限</li>
              <li>
                插件是<b>在你机器上运行的第三方代码</b>，收录不代表背书
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section style={{ paddingTop: 88 }}>
          <div className="sec-head" style={{ marginBottom: 28 }}>
            <div>
              <span className="label">
                <i />
                RELATED
              </span>
              <h2 className="sec-title" style={{ fontSize: 26 }}>
                同分类的插件
              </h2>
            </div>
            <Link className="sec-link" href={`/plugins?category=${plugin.category}`}>
              查看全部 {categoryLabel(plugin.category)} 插件
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="result-grid">
            {related.map((p) => (
              <PluginCard key={p.slug} plugin={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function generateStaticParams() {
  // 只预渲染 Star 最高的一批，其余按需渲染（dynamicParams）
  return allPlugins()
    .slice()
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 30)
    .map((p) => ({ owner: p.owner, repo: p.repo }))
}
