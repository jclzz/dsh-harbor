import Link from 'next/link'
import { ArrowRight, RssIcon } from '@/components/icons'
import { InstallCard } from '@/components/install-card'
import { PluginCard } from '@/components/plugin-card'
import { PluginRow } from '@/components/plugin-row'
import { CATEGORIES } from '@/lib/categories'
import {
  allPlugins,
  avatarChar,
  comparator,
  contributors,
  featuredPlugins,
  formatStars,
  gradientFor,
  statsOf,
} from '@/lib/catalog'

export const revalidate = 30

export default function HomePage() {
  const plugins = allPlugins()
  const stats = statsOf(plugins)
  const featured = featuredPlugins(6)
  const latest = [...plugins].sort(comparator('updated')).slice(0, 6)
  const { list: topContributors, total: contributorCount } = contributors(9)
  const hero = featured[0]

  const chips = [
    { id: 'all', label: '全部', count: stats.total },
    ...CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      count: stats.perCategory[c.id] ?? 0,
    })).filter((c) => c.count > 0),
  ]

  return (
    <>
      {/* ================= Hero ================= */}
      <header className="hero wrap">
        <div>
          <p className="kicker">
            DeepSeek Harness · <span className="mono">群友共建插件收录站</span>
          </p>
          <h1>
            社区插件，
            <br />
            <span className="blue">随需挂载</span>
          </h1>
          <p className="sub">
            一切皆插件。这里收录社区为 DeepSeek Harness 开发的每一个插件 —— 浏览、搜索、一键安装，
            每条都链回公开仓库，源码可查。
          </p>
          <div className="actions">
            <Link className="btn btn-primary btn-lg" href="/plugins">
              浏览插件库
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/submit">
              提交插件
            </Link>
            <a
              className="btn btn-ghost btn-lg"
              href="https://deepseek.com/harness"
              target="_blank"
              rel="noreferrer"
            >
              开发文档
            </a>
          </div>
        </div>

        <InstallCard
          pluginName={hero?.name ?? 'modlens'}
          repoFullName={hero ? `${hero.owner}/${hero.repo}` : 'liustack/modlens'}
          stars={hero?.stars ?? 0}
          stats={[
            { label: '收录插件', value: String(stats.total) },
            { label: '社区作者', value: String(stats.authors) },
            { label: '累计 Star', value: formatStars(stats.stars) },
            { label: '本周新上架', value: String(stats.addedThisWeek) },
          ]}
        />
      </header>

      {/* ================= 分类 chips ================= */}
      <div className="chips" id="categories">
        <div className="wrap">
          <span className="lead">// 按分类浏览</span>
          {chips.map((chip) => (
            <Link
              key={chip.id}
              className={`chip${chip.id === 'all' ? ' on' : ''}`}
              href={chip.id === 'all' ? '/plugins' : `/plugins?category=${chip.id}`}
            >
              {chip.label}
              <span className="cnt">{chip.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ================= 本周精选 ================= */}
      <section className="wrap" id="featured">
        <div className="sec-head">
          <div>
            <span className="label">
              <i />
              FEATURED
            </span>
            <h2 className="sec-title">本周精选</h2>
            <p className="sec-desc">由群友提名，按仓库活跃度与 Star 排出的本期推荐</p>
          </div>
          <Link className="sec-link" href="/plugins">
            查看全部 {stats.total} 个插件
            <ArrowRight />
          </Link>
        </div>

        <div className="grid">
          {featured.map((plugin, index) => (
            <PluginCard
              key={plugin.slug}
              plugin={plugin}
              hot={index === 0}
              hotLabel="HOT · No.1"
            />
          ))}
        </div>
      </section>

      {/* ================= 最新上架 ================= */}
      <section className="wrap">
        <div className="latest">
          <div>
            <span className="label">
              <i />
              NEW
            </span>
            <h2 className="sec-title">最新上架</h2>
            <p className="sec-desc" style={{ lineHeight: 1.9 }}>
              新提交的插件即时上架，列表按仓库最近提交时间排序。上架只做基础校验，
              安装前请先看源码和权限声明。
            </p>
            <a className="btn btn-ghost" style={{ marginTop: 30 }} href="/rss.xml">
              订阅更新 RSS
              <RssIcon />
            </a>
          </div>
          <div className="list">
            {latest.map((plugin) => (
              <PluginRow key={plugin.slug} plugin={plugin} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= 提交插件 ================= */}
      <section className="wrap" id="contribute">
        <div className="submit">
          <div>
            <span className="label">
              <i />
              CONTRIBUTE
            </span>
            <h2 className="sec-title">提交你的插件</h2>
            <p className="sec-desc" style={{ lineHeight: 1.9 }}>
              写完插件只要三步，填个仓库地址就上架 —— 不排队、不人工审核。
            </p>
            <div className="steps">
              <div className="step">
                <span className="step-num">01</span>
                <div>
                  <h3>开发</h3>
                  <p>
                    导出 <span className="mono">apply(ctx)</span>，在 package.json 声明{' '}
                    <span className="mono">dsh.bundle</span>，本地跑通。
                  </p>
                </div>
              </div>
              <div className="step">
                <span className="step-num">02</span>
                <div>
                  <h3>提交</h3>
                  <p>
                    在 <Link href="/submit" style={{ color: 'var(--text)' }}>提交页</Link>粘贴仓库地址，
                    系统会自动抓取 Star、许可证、版本与描述。
                  </p>
                </div>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <div>
                  <h3>上架</h3>
                  <p>
                    校验通过后立刻出现在插件库里，同时生成{' '}
                    <span className="mono">/badge/&lt;slug&gt;.svg</span> 徽章可以贴回 README。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="code-win">
            <div className="code-bar">
              <span className="d" />
              <span className="d" />
              <span className="d" />
              <span className="tab">package.json</span>
              <span className="tab2">index.ts</span>
            </div>
            <div className="code-body">
              <div className="ln">
                <span className="no">1</span>
                <span className="tk-p">{'{'}</span>
              </div>
              <div className="ln">
                <span className="no">2</span>
                <span>
                  &nbsp;&nbsp;<span className="tk-k">&quot;name&quot;</span>
                  <span className="tk-p">:</span> <span className="tk-s">&quot;dsh-hello&quot;</span>
                  <span className="tk-p">,</span>
                </span>
              </div>
              <div className="ln">
                <span className="no">3</span>
                <span>
                  &nbsp;&nbsp;<span className="tk-k">&quot;version&quot;</span>
                  <span className="tk-p">:</span> <span className="tk-s">&quot;0.1.0&quot;</span>
                  <span className="tk-p">,</span>
                </span>
              </div>
              <div className="ln">
                <span className="no">4</span>
                <span>
                  &nbsp;&nbsp;<span className="tk-k">&quot;main&quot;</span>
                  <span className="tk-p">:</span> <span className="tk-s">&quot;dist/index.js&quot;</span>
                  <span className="tk-p">,</span>
                </span>
              </div>
              <div className="ln">
                <span className="no">5</span>
                <span>
                  &nbsp;&nbsp;<span className="tk-k">&quot;dsh&quot;</span>
                  <span className="tk-p">: {'{'} </span>
                  <span className="tk-k">&quot;bundle&quot;</span>
                  <span className="tk-p">:</span>{' '}
                  <span className="tk-s">&quot;dist/index.js&quot;</span>
                  <span className="tk-p"> {'}'},</span>
                </span>
              </div>
              <div className="ln">
                <span className="no">6</span>
                <span>
                  &nbsp;&nbsp;<span className="tk-k">&quot;peerDependencies&quot;</span>
                  <span className="tk-p">: {'{'} </span>
                  <span className="tk-k">&quot;@deepseek-ai/dsh&quot;</span>
                  <span className="tk-p">:</span> <span className="tk-s">&quot;&gt;=0.9.0&quot;</span>
                  <span className="tk-p"> {'}'}</span>
                </span>
              </div>
              <div className="ln">
                <span className="no">7</span>
                <span className="tk-p">{'}'}</span>
              </div>
            </div>
            <div className="code-cmd">
              <div>
                <span className="ps">$ </span>
                <span style={{ color: 'var(--text)' }}>dsh plugin --profile web add github:you/dsh-hello</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <span className="ok">✓</span>{' '}
                <span className="cm">已加入 web profile · 重启 dsh web 后由 Cordis 内核挂载</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 贡献者 ================= */}
      <section className="wrap contributors">
        <span className="label">
          <i />
          CONTRIBUTORS
        </span>
        <h2 className="sec-title">社区贡献者</h2>
        <p className="sec-desc">{contributorCount} 位作者提交了插件，下一个就是你</p>
        <div className="avatars">
          {topContributors.map((c) => (
            <Link className="contrib" key={c.owner} href={`/plugins?q=${encodeURIComponent(c.owner)}`}>
              <span className="avatar" style={{ background: gradientFor(c.owner) }}>
                {avatarChar(c.name)}
              </span>
              <span className="nm">{c.name}</span>
              <span className="ct">
                {c.count} {c.count > 1 ? 'plugins' : 'plugin'}
              </span>
            </Link>
          ))}
          {contributorCount > topContributors.length ? (
            <Link className="contrib more" href="/plugins?sort=added">
              <span className="avatar">+{contributorCount - topContributors.length}</span>
              <span className="nm">更多作者</span>
              <span className="ct">&nbsp;</span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="wrap cta">
        <div className="cta-box">
          <h2>
            你的插件，值得被更多 <span className="blue">Harness</span> 用户看到
          </h2>
          <p>填一个仓库地址就上架，不排队。也可以给 README 贴上 DSHub 徽章，让 Star 数自动跟着同步。</p>
          <div className="cta-actions">
            <Link className="btn btn-primary btn-lg" href="/submit">
              提交插件
            </Link>
            <a
              className="btn btn-ghost btn-lg"
              href="https://deepseek.com/harness"
              target="_blank"
              rel="noreferrer"
            >
              阅读开发文档
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
