import { useMemo } from 'react'
import type { AccountGroup } from '../domain/types'

function pathTo(groups: AccountGroup[], id?: string) {
  if (!id) return []
  const result: AccountGroup[] = []
  const seen = new Set<string>()
  let current = groups.find(g => g.id === id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id); result.unshift(current)
    current = current.parentId ? groups.find(g => g.id === current!.parentId) : undefined
  }
  return result
}

export function GroupCascader({ groups: rawGroups, value, onChange, label = 'المجموعة', allowRoot = true }: { groups: AccountGroup[]; value: string; onChange: (id: string) => void; label?: string; allowRoot?: boolean }) {
  const groups = useMemo(() => rawGroups.filter(g => g.status === 'active'), [rawGroups])
  const path = pathTo(groups, value)
  const roots = groups.filter(g => !g.parentId || !groups.some(p => p.id === g.parentId)).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  const levels: AccountGroup[][] = [roots]
  path.forEach(node => {
    const children = groups.filter(g => g.parentId === node.id).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    if (children.length) levels.push(children)
  })
  const choose = (level: number, id: string) => {
    if (!id) { const next = path.slice(0, level); onChange(next[next.length - 1]?.id ?? ''); return }
    onChange(id)
  }
  return <div className="parent-cascader group-cascader"><div className="cascader-label"><span>{label}</span><strong>{path.length ? path.map(g => g.name).join(' ← ') : 'من الجذر'}</strong></div><div className="cascader-levels">{levels.map((options, index) => <label key={index}><span>المستوى {index + 1}</span><select value={path[index]?.id ?? ''} onChange={e => choose(index, e.target.value)}><option value="">{index === 0 && allowRoot ? 'من الجذر / بدون مجموعة' : 'اكتفِ بالمستوى السابق'}</option>{options.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>)}</div></div>
}
