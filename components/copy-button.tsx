'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from '@/components/icons'

export function CopyButton({
  value,
  label = '复制',
  doneLabel = '已复制',
  className,
  showIcon = true,
}: {
  value: string
  label?: string
  doneLabel?: string
  className?: string
  showIcon?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // 非 https / 无权限时的兜底
      const el = document.createElement('textarea')
      el.value = value
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(el)
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }, [value])

  return (
    <button type="button" className={className ?? 'ic-copy'} onClick={onCopy} aria-label={label}>
      {showIcon ? copied ? <CheckIcon /> : <CopyIcon /> : null}
      {copied ? doneLabel : label}
    </button>
  )
}
