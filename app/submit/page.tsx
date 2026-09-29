import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from '@/components/icons'
import { SubmitForm } from '@/components/submit-form'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: '提交插件',
  description:
    '把你的 DeepSeek Harness 插件提交到插件港。填一个仓库地址即可上架，不排队、不人工审核。',
  alternates: { canonical: '/submit' },
}

export const revalidate = 3600

export default function SubmitPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <nav className="breadcrumb">
          <Link href="/">首页</Link>
          <ChevronRight size={12} />
          <span>提交插件</span>
        </nav>
        <h1>提交插件</h1>
        <p className="sub">
          填一个公开 GitHub 仓库地址，确认三件事，点提交 —— 立刻上架，不需要等审核。
          收录不收费，也不要求你改任何代码。
        </p>
      </div>

      <div className="form-layout" style={{ paddingBottom: 40 }}>
        <SubmitForm />

        <aside>
          <div className="side-note">
            <h3>三个硬要求</h3>
            <ol>
              <li>
                仓库<b>公开</b>，能匿名访问
              </li>
              <li>
                README 里写清安装方式，最好是{' '}
                <code>dsh plugin --profile web add github:owner/repo</code>
              </li>
              <li>
                有<b>许可证</b>。没写许可证的仓库不收录
              </li>
            </ol>
          </div>

          <div className="side-note">
            <h3>提交后会发生什么</h3>
            <ol>
              <li>系统读一次 GitHub：Star、许可证、语言、最近提交、描述</li>
              <li>条目立刻进入插件库，能被搜索到，并生成专属页面</li>
              <li>同时生成 README 徽章，Star 数随目录同步自动更新</li>
            </ol>
            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.8 }}>
              我们不做人工核验，所以条目标注的是「未核验 · 群友收录」。想升级成「已核验」，
              在仓库里加上 <code>dsh-plugin</code> topic 并保证 README 有安装命令即可。
            </p>
          </div>

          <div className="side-note">
            <h3>怎么写出好装好用的插件</h3>
            <ul>
              <li>
                导出 <code>apply(ctx)</code>，或在 package.json 里声明{' '}
                <code>dsh.bundle</code>（需要前端再声明 <code>dsh.client</code>）
              </li>
              <li>别复用官方核心 row id（tools / session / llm / web / permission）</li>
              <li>
                加上 <code>dsh-plugin</code> topic，这样也会被其他目录站发现
              </li>
              <li>
                <a href={SITE.repo} target="_blank" rel="noreferrer">
                  Harness 官方仓库
                </a>{' '}
                里有 Cordis 教程与 cookbook
              </li>
            </ul>
          </div>

          <div className="side-note">
            <h3>不想填表？</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9 }}>
              直接给仓库加 <code>dsh-plugin</code> topic 也可以 —— 目录每天会扫一遍话题，
              命中的仓库自动收录。{' '}
              <a href={SITE.topicUrl} target="_blank" rel="noreferrer">
                看看话题里都有什么
              </a>
              。
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
