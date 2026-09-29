'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, SearchIcon } from '@/components/icons'
import { CATEGORIES } from '@/lib/categories'
import { formatStars, licenseLabel } from '@/lib/format'
import { parseRepoInput } from '@/lib/repo-input'
import { SITE } from '@/lib/site'
import type { CategoryId } from '@/lib/types'

interface RepoPreview {
  fullName: string
  name: string
  owner: string
  description: string | null
  htmlUrl: string
  stars: number
  forks: number
  license: string | null
  language: string | null
  topics: string[]
  pushedAt: string | null
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; repo: RepoPreview; exists: boolean; existingUrl?: string }
  | { kind: 'error'; message: string }

export function SubmitForm() {
  const [repo, setRepo] = useState('')
  const [name, setName] = useState('')
  const [nameZh, setNameZh] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CategoryId | ''>('')
  const [tags, setTags] = useState('')
  const [author, setAuthor] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [note, setNote] = useState('')
  const [agree, setAgree] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ slug: string; url: string; name: string } | null>(null)

  const lastChecked = useRef('')

  const checkRepo = useCallback(
    async (value: string) => {
      const parsed = parseRepoInput(value)
      if (!parsed) {
        setStatus(value.trim() ? { kind: 'error', message: '仓库地址格式不对，例如 owner/repo' } : { kind: 'idle' })
        return
      }
      if (lastChecked.current === parsed.fullName) return
      lastChecked.current = parsed.fullName
      setStatus({ kind: 'loading' })
      try {
        const res = await fetch(`/api/repo?full=${encodeURIComponent(parsed.fullName)}`)
        const json = (await res.json()) as
          | { ok: true; exists: boolean; repo: RepoPreview; slug?: string; url?: string; name?: string }
          | { ok: false; error: string }
        if (!json.ok) {
          setStatus({ kind: 'error', message: json.error })
          return
        }
        if (json.exists) {
          setStatus({ kind: 'ok', exists: true, existingUrl: json.url, repo: { fullName: parsed.fullName } as RepoPreview })
          return
        }
        setStatus({ kind: 'ok', exists: false, repo: json.repo })
        if (!name) setName(json.repo.name)
        if (!description && json.repo.description) setDescription(json.repo.description.slice(0, 240))
        if (!author) setAuthor(json.repo.owner)
      } catch {
        setStatus({ kind: 'error', message: '查询失败，检查一下网络' })
      }
    },
    [author, description, name]
  )

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!parseRepoInput(repo)) next.repo = '请填写正确的 GitHub 仓库地址'
    if (description.trim().length < 6) next.description = '至少写 6 个字'
    if (!category) next.category = '请选择分类'
    if (!agree) next.agree = '请先确认收录要求'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          repo,
          name,
          nameZh,
          description,
          category,
          tags,
          author,
          submittedBy,
          note,
          agree,
          website: honeypot,
        }),
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        slug?: string
        url?: string
        name?: string
        existing?: { slug: string; url: string }
      }
      if (!json.ok) {
        if (json.existing) {
          setErrors({ form: `${json.error}，去看看 👉 ${json.existing.url}` })
        } else {
          setErrors({ form: json.error ?? '提交失败' })
        }
        return
      }
      setResult({ slug: json.slug!, url: json.url!, name: json.name! })
    } catch {
      setErrors({ form: '网络异常，稍后再试' })
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const badge = `[![DSHub](${SITE.url}/badge/${result.slug}.svg)](${SITE.url}/plugins/${result.slug})`
    return (
      <div className="form-card">
        <div className="alert ok">
          <b>上架成功</b> —— {result.name} 已经出现在插件库里，现在就能被搜到。
        </div>
        <div className="field">
          <label>插件页面</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href={result.url}>
              打开插件页
            </Link>
            <Link className="btn btn-ghost" href="/plugins">
              回到插件库
            </Link>
          </div>
        </div>
        <div className="field">
          <label>README 徽章</label>
          <textarea className="textarea mono" readOnly value={badge} style={{ fontSize: 12 }} />
          <p className="hint">把这段贴进 README，Star 数会跟着目录同步自动刷新。</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>信息有误？</label>
          <p className="hint">
            直接重新提交同一个仓库不会覆盖已有条目（会提示已收录）。
            需要改分类或简介，到 <Link href="/about#contact">关于页</Link> 找我们，或在仓库里开个 issue。
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate>
      {errors.form ? <div className="alert err">{errors.form}</div> : null}

      <div className="field">
        <label htmlFor="repo">
          GitHub 仓库地址 <span className="req">*</span>
        </label>
        <input
          id="repo"
          className="input mono"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onBlur={(e) => void checkRepo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void checkRepo(repo)
            }
          }}
          placeholder="owner/repo 或 https://github.com/owner/repo"
          aria-invalid={!!errors.repo}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="hint">粘贴仓库地址后点一下别处（或按回车）就会自动读取仓库信息。</p>
        {errors.repo ? <p className="err">{errors.repo}</p> : null}
        <RepoStatus status={status} />
        {/* 蜜罐：正常用户不会填 */}
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="name">
            展示名 <span className="opt">默认用仓库名</span>
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ModLens"
            maxLength={60}
          />
        </div>
        <div className="field">
          <label htmlFor="nameZh">
            中文短名 <span className="opt">卡片副标题</span>
          </label>
          <input
            id="nameZh"
            className="input"
            value={nameZh}
            onChange={(e) => setNameZh(e.target.value)}
            placeholder="视觉外挂"
            maxLength={30}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">
          一句话简介 <span className="req">*</span>
        </label>
        <textarea
          id="description"
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="它解决什么问题？一句话说清，中文优先。"
          maxLength={240}
          aria-invalid={!!errors.description}
        />
        <p className="hint">
          {description.length}/240 · 会显示在卡片和搜索结果里
        </p>
        {errors.description ? <p className="err">{errors.description}</p> : null}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="category">
            分类 <span className="req">*</span>
          </label>
          <select
            id="category"
            className="select"
            style={{ width: '100%' }}
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            aria-invalid={!!errors.category}
          >
            <option value="">请选择…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} —— {c.desc}
              </option>
            ))}
          </select>
          {errors.category ? <p className="err">{errors.category}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="tags">
            标签 <span className="opt">逗号分隔</span>
          </label>
          <input
            id="tags"
            className="input mono"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="vision, ocr"
            maxLength={160}
          />
          <p className="hint">会合并仓库自带的 topics</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="author">
            作者昵称 <span className="opt">默认用 GitHub 用户名</span>
          </label>
          <input
            id="author"
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="海边的卡夫卡"
            maxLength={40}
          />
        </div>
        <div className="field">
          <label htmlFor="submittedBy">
            你的昵称 <span className="opt">选填</span>
          </label>
          <input
            id="submittedBy"
            className="input"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="谁提交的"
            maxLength={40}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="note">
          想说的话 <span className="opt">选填</span>
        </label>
        <textarea
          id="note"
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="使用场景、注意事项、踩过的坑…会显示在插件页侧栏。"
          maxLength={300}
          style={{ minHeight: 72 }}
        />
      </div>

      <div className="field check-row">
        <input
          id="agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          aria-invalid={!!errors.agree}
        />
        <label htmlFor="agree" style={{ fontWeight: 400, marginBottom: 0 }}>
          确认：仓库是公开的，README 里有可执行的安装命令，并且声明了开源许可证。
          <br />
          <span style={{ color: 'var(--text-3)' }}>
            提交不需要人工审核，点击后立即上架 —— 所以请自己确认一遍上面的三件事。
          </span>
        </label>
      </div>
      {errors.agree ? <p className="err">{errors.agree}</p> : null}

      <div className="form-foot">
        <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
          {submitting ? '正在上架…' : '提交并立即上架'}
        </button>
        <span className="note">
          提交即代表你确认该仓库可公开访问。收录不代表安全背书，安装前请自行审阅源码。
        </span>
      </div>
    </form>
  )
}

function RepoStatus({ status }: { status: Status }) {
  if (status.kind === 'idle') return null
  if (status.kind === 'loading') {
    return (
      <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SearchIcon size={13} /> 正在读 GitHub 仓库信息…
      </p>
    )
  }
  if (status.kind === 'error') {
    return <p className="err">{status.message}</p>
  }
  if (status.exists) {
    return (
      <p className="hint">
        这个仓库已经收录过了 ——{' '}
        <Link href={status.existingUrl ?? '/plugins'} style={{ color: 'var(--text)' }}>
          打开插件页
        </Link>
      </p>
    )
  }
  const repo = status.repo
  return (
    <div className="alert ok" style={{ marginTop: 12, marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <CheckIcon size={12} />
        <b>{repo.fullName}</b>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          ★ {formatStars(repo.stars)} · {licenseLabel(repo.license) ?? '未声明许可证'}
          {repo.language ? ` · ${repo.language}` : ''}
        </span>
      </div>
      {repo.description ? (
        <span style={{ color: 'rgba(255,255,255,.7)' }}>{repo.description}</span>
      ) : (
        <span style={{ color: 'rgba(255,255,255,.5)' }}>仓库没有写简介，记得自己填一句话。</span>
      )}
    </div>
  )
}
