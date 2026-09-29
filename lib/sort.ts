/**
 * 客户端安全常量：不依赖 node:fs，可以放心被 'use client' 组件引用。
 */

export type SortKey = 'stars' | 'updated' | 'added' | 'name'

export const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'stars', label: '按 Star' },
  { id: 'updated', label: '按最近更新' },
  { id: 'added', label: '按收录时间' },
  { id: 'name', label: '按名称' },
]

export function isSortKey(value: string | undefined | null): value is SortKey {
  return !!value && SORTS.some((s) => s.id === value)
}
