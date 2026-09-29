'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'

export interface InstallCardProps {
  pluginName: string
  repoFullName: string
  stars: number
  stats: { label: string; value: string }[]
}

export function InstallCard({ pluginName, repoFullName, stars, stats }: InstallCardProps) {
  const [tab, setTab] = useState<'quick' | 'manual'>('quick')

  const quick = `dsh plugin --profile web add github:${repoFullName}`
  const manual = `npx -p @deepseek-ai/dsh dsh plugin --profile web add github:${repoFullName}`

  const command = tab === 'quick' ? quick : manual
  const [head, tail] = splitCommand(command, pluginName)

  return (
    <div className="install-card">
      <div className="ic-bar">
        <span className="d" />
        <span className="d" />
        <span className="d" />
        <div className="ic-tabs">
          <button type="button" className={tab === 'quick' ? 'on' : ''} onClick={() => setTab('quick')}>
            一键安装
          </button>
          <button type="button" className={tab === 'manual' ? 'on' : ''} onClick={() => setTab('manual')}>
            手动安装
          </button>
        </div>
      </div>

      <div className="ic-body">
        <div className="ic-cmd">
          <span className="ps">$</span>
          <span className="c">
            {head}
            {tail ? <b>{tail}</b> : null}
          </span>
          <CopyButton value={command} className="ic-copy" />
        </div>

        <p className="ic-note">
          {tab === 'quick' ? (
            <>
              需要 DeepSeek Harness <span className="mono">&gt;= 0.9.0</span>。dsh plugin 是 pnpm 转发器：
              声明了 <span className="mono">dsh.bundle</span> 的包会加入 web profile，重启后由 Cordis 内核自动挂载。
            </>
          ) : (
            <>
              没有全局安装 dsh 也可以用 <span className="mono">npx</span> 直接拉起来，命令会锁定到
              仓库默认分支；要复现构建可以把 <span className="mono">github:owner/repo#&lt;commit&gt;</span>
              换成具体提交。
            </>
          )}
        </p>

        <div className="ic-foot">
          {stats.map((s) => (
            <div className="ic-stat" key={s.label}>
              <div className="n">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 把命令里最后一个词高亮成蓝色，对齐设计里的 <b> 用法 */
function splitCommand(command: string, highlight: string): [string, string] {
  const tokens = command.split(' ')
  const last = tokens.pop() ?? ''
  const head = `${tokens.join(' ')}${tokens.length ? ' ' : ''}`
  void highlight
  return [head, last]
}

export function installStatsLabel(stars: number): string {
  return stars > 999 ? `${Math.round(stars / 1000)}k` : String(stars)
}
