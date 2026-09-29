import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from '@/components/icons'
import { CATEGORIES, categoryDesc, categoryLabel } from '@/lib/categories'
import { allPlugins, readCatalog, statsOf } from '@/lib/catalog'
import { formatStars, relativeTime } from '@/lib/format'
import { SITE } from '@/lib/site'

export const revalidate = 300

export const metadata: Metadata = {
  title: '关于与收录规范',
  description:
    'DSHub 是什么、收录标准、数据来源与更新方式、如何提交插件、以及免责声明。',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  const plugins = allPlugins()
  const stats = statsOf(plugins)
  const catalog = readCatalog()
  const top = [...plugins].sort((a, b) => b.stars - a.stars).slice(0, 8)

  return (
    <div className="wrap">
      <div className="page-head">
        <nav className="breadcrumb">
          <Link href="/">首页</Link>
          <ChevronRight size={12} />
          <span>关于</span>
        </nav>
        <h1>关于 DSHub</h1>
        <p className="sub">
          DSHub 是一个社区维护的 DeepSeek Harness（DSH）插件收录站。目标是让「找到一个插件」
          这件事变成：搜一下、看一眼源码、复制一条命令、重启。
        </p>
      </div>

      <div className="form-layout" style={{ paddingBottom: 20 }}>
        <div>
          <div className="side-note" style={{ padding: '30px 32px' }}>
            <h3 style={{ fontSize: 16 }}>收录规范</h3>
            <ol style={{ fontSize: 13.5 }}>
              <li>
                <b>公开仓库</b>：能在未登录状态下访问的 GitHub 仓库。私有仓库、镜像里没有源码的不收。
              </li>
              <li>
                <b>和 DSH 有关</b>：README 里能说明它怎么挂进 Harness（导出 <code>apply(ctx)</code>、
                声明 <code>dsh.bundle</code>，或是以 skill / MCP / 技能包的形式接入）。
              </li>
              <li>
                <b>能装上</b>：给出可执行的安装方式，最好是一条{' '}
                <code>dsh plugin --profile web add …</code>。
              </li>
              <li>
                <b>有许可证</b>：没写许可证的仓库不收录 —— 没许可证等于没授权别人使用。
              </li>
              <li>
                <b>未归档</b>：已归档的仓库会被过滤掉。
              </li>
            </ol>
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9 }}>
              我们不评判插件「好不好用」，也不做兼容性认证。条目上的
              「未核验 / 已核验」只表示我们有没有确认过仓库可访问、README 有安装命令、许可证存在。
              <b>收录不代表安全背书</b>：插件是装到你机器上运行的第三方代码，安装前请自己看一眼源码。
            </p>
          </div>

          <div className="side-note" style={{ marginTop: 20, padding: '30px 32px' }}>
            <h3 style={{ fontSize: 16 }}>数据从哪来，多久更新一次</h3>
            <ul style={{ fontSize: 13.5 }}>
              <li>
                <b>群友提交</b>：在 <Link href="/submit">提交页</Link> 填仓库地址，
                系统实时读 GitHub 元数据后立刻上架，不排队、不人工审核。
              </li>
              <li>
                <b>话题自动收录</b>：每天扫一遍 GitHub 的{' '}
                <a href={SITE.topicUrl} target="_blank" rel="noreferrer">
                  dsh-plugin
                </a>{' '}
                话题，命中的仓库自动进目录。
              </li>
              <li>
                <b>Star / 更新时间</b>：由同步脚本批量刷新，不是页面即时报的，
                所以可能比 GitHub 慢一拍。上一次同步：{relativeTime(catalog.updatedAt)}。
              </li>
              <li>
                <b>安装命令</b>：统一写成 <code>dsh plugin --profile web add github:owner/repo</code>。
                要复现构建可以把仓库地址换成 <code>github:owner/repo#&lt;commit&gt;</code>。
              </li>
            </ul>
          </div>

          <div className="side-note" style={{ marginTop: 20, padding: '30px 32px' }} id="contact">
            <h3 style={{ fontSize: 16 }}>纠错与反馈</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.9 }}>
              分类错了、简介写偏了、条目重复、仓库失效 —— 都可以直接说。
              最快的办法是在插件对应的 GitHub 仓库提 issue，或者在群里 @ 维护的同学。
              数据文件是 <code>data/plugins.json</code>，改完发 PR 也可以。
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/submit">
                提交新插件
              </Link>
              <a className="btn btn-ghost" href={SITE.topicUrl} target="_blank" rel="noreferrer">
                去 GitHub 话题看看
              </a>
            </div>
          </div>

          <div className="side-note" style={{ marginTop: 20, padding: '30px 32px' }}>
            <h3 style={{ fontSize: 16 }}>免责声明</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.9 }}>
              DSHub 是社区维护的非官方项目，与 DeepSeek 官方没有隶属关系。
              DeepSeek、DeepSeek Harness 及相关标识归其所有者所有。
              插件的著作权与责任归各作者所有；本站只做索引，不托管代码、不代理下载。
              因安装第三方插件造成的任何后果由使用者自行承担。
            </p>
          </div>
        </div>

        <aside>
          <div className="meta-card">
            <div className="meta-stats">
              <div>
                <div className="n">{stats.total}</div>
                <div className="l">收录插件</div>
              </div>
              <div>
                <div className="n">{stats.authors}</div>
                <div className="l">社区作者</div>
              </div>
            </div>
            <h3>分类分布</h3>
            <div className="meta-list">
              {CATEGORIES.filter((c) => (stats.perCategory[c.id] ?? 0) > 0).map((c) => (
                <div className="meta-item" key={c.id}>
                  <span className="k">
                    <Link href={`/plugins?category=${c.id}`}>{c.label}</Link>
                  </span>
                  <span className="v">{stats.perCategory[c.id]}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h3>累计数据</h3>
              <div className="meta-list">
                <div className="meta-item">
                  <span className="k">Star 合计</span>
                  <span className="v">{formatStars(stats.stars)}</span>
                </div>
                <div className="meta-item">
                  <span className="k">群友提交</span>
                  <span className="v">{stats.group}</span>
                </div>
                <div className="meta-item">
                  <span className="k">精选收录</span>
                  <span className="v">{stats.curated}</span>
                </div>
                <div className="meta-item">
                  <span className="k">本周新增</span>
                  <span className="v">{stats.addedThisWeek}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="side-note" style={{ marginTop: 20 }}>
            <h3>给写插件的人</h3>
            <ul>
              <li>
                导出 <code>apply(ctx)</code>，或声明 <code>dsh.bundle</code>
              </li>
              <li>
                加上 <code>dsh-plugin</code> topic，多一个被发现的机会
              </li>
              <li>
                贴上前面的徽章：
                <br />
                <code style={{ display: 'block', marginTop: 6, fontSize: 11, wordBreak: 'break-all' }}>
                  [![DSHub]({SITE.url}/badge/&lt;slug&gt;.svg)]({SITE.url}/plugins/&lt;slug&gt;)
                </code>
              </li>
            </ul>
          </div>

          <div className="side-note" style={{ marginTop: 20 }}>
            <h3>Star 最多的几个</h3>
            <div className="meta-list">
              {top.map((p) => (
                <div className="meta-item" key={p.slug}>
                  <span className="k" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Link href={`/plugins/${p.slug}`}>{p.name}</Link>
                  </span>
                  <span className="v">{formatStars(p.stars)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
