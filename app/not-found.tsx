import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <p className="kicker mono">404</p>
        <h1>这个页面不存在</h1>
        <p className="sub">
          地址可能拼错了，或者这个插件还没有被收录。你可以从下面几个入口继续。
        </p>
        <div className="actions" style={{ marginTop: 30, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-lg" href="/plugins">
            浏览插件库
          </Link>
          <Link className="btn btn-ghost btn-lg" href="/submit">
            提交插件
          </Link>
          <Link className="btn btn-ghost btn-lg" href="/">
            回到首页
          </Link>
        </div>
      </div>

      <section style={{ paddingTop: 64 }}>
        <span className="label">
          <i />
          CATEGORIES
        </span>
        <div className="cat-row" style={{ marginTop: 22 }}>
          {CATEGORIES.map((c) => (
            <Link className="chip" key={c.id} href={`/plugins?category=${c.id}`}>
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
