import { useEffect, useMemo, useState } from 'react'
import type { AccountGroup, Holding } from '../domain/types'

const sortAr = <T extends { name: string }>(items: T[]) => [...items].sort((a, b) => a.name.localeCompare(b.name, 'ar'))

function groupPath(groups: AccountGroup[], groupId?: string): AccountGroup[] {
  if (!groupId) return []
  const result: AccountGroup[] = []
  const seen = new Set<string>()
  let current = groups.find(g => g.id === groupId)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    result.unshift(current)
    current = current.parentId ? groups.find(g => g.id === current!.parentId) : undefined
  }
  return result
}

export interface GroupAssetCascadeLevel {
  parentId?: string
  groups: AccountGroup[]
  assets: Holding[]
}

/** Pure helper kept exported so tree behavior can be regression-tested without a DOM. */
export function buildGroupAssetLevels(rawGroups: AccountGroup[], rawAssets: Holding[], pathIds: string[]): GroupAssetCascadeLevel[] {
  const groups = rawGroups.filter(g => g.status === 'active')
  const activeAssets = rawAssets.filter(a => !a.archived)
  const path = pathIds.map(id => groups.find(g => g.id === id)).filter((g): g is AccountGroup => !!g)
  const parents: Array<string | undefined> = [undefined, ...path.map(g => g.id)]
  return parents.map(parentId => ({
    parentId,
    groups: sortAr(groups.filter(g => parentId ? g.parentId === parentId : !g.parentId || !groups.some(p => p.id === g.parentId))),
    assets: sortAr(activeAssets.filter(a => (a.groupId || undefined) === parentId)),
  }))
}

export function GroupAssetCascader({
  groups: rawGroups,
  assets: rawAssets,
  value,
  onChange,
  isEligible = () => true,
  label = 'الأصل',
  placeholder = 'اختر الأصل',
}: {
  groups: AccountGroup[]
  assets: Holding[]
  value: string
  onChange: (assetId: string) => void
  isEligible?: (asset: Holding) => boolean
  label?: string
  placeholder?: string
}) {
  const groups = useMemo(() => rawGroups.filter(g => g.status === 'active'), [rawGroups])
  const assets = useMemo(() => rawAssets.filter(a => !a.archived && isEligible(a)), [rawAssets, isEligible])
  const selected = assets.find(a => a.id === value)
  const [pathIds, setPathIds] = useState<string[]>(() => groupPath(groups, selected?.groupId).map(g => g.id))

  useEffect(() => {
    if (!value) return
    const asset = assets.find(a => a.id === value)
    if (asset) setPathIds(groupPath(groups, asset.groupId).map(g => g.id))
  }, [value, assets, groups])

  const path = pathIds.map(id => groups.find(g => g.id === id)).filter((g): g is AccountGroup => !!g)
  const levels = buildGroupAssetLevels(groups, assets, pathIds)
  const selectedLevel = selected ? path.length : -1
  const breadcrumb = [...path.map(g => g.name), ...(selected ? [selected.name] : [])]

  const choose = (levelIndex: number, raw: string) => {
    if (!raw) {
      setPathIds(pathIds.slice(0, levelIndex))
      onChange('')
      return
    }
    const [kind, id] = raw.split(':', 2)
    if (kind === 'g') {
      setPathIds([...pathIds.slice(0, levelIndex), id])
      onChange('')
      return
    }
    if (kind === 'a') {
      setPathIds(pathIds.slice(0, levelIndex))
      onChange(id)
    }
  }

  return <div className="parent-cascader group-cascader asset-cascader">
    <div className="cascader-label"><span>{label}</span><strong>{breadcrumb.length ? breadcrumb.join(' ← ') : 'من الجذر'}</strong></div>
    <div className="cascader-levels">
      {levels.map((level, index) => {
        const selectedGroup = path[index]
        const selectedCode = selectedGroup ? `g:${selectedGroup.id}` : selectedLevel === index && selected ? `a:${selected.id}` : ''
        const hasOptions = level.groups.length > 0 || level.assets.length > 0 || !!selectedCode
        if (!hasOptions) return <label key={`${level.parentId ?? 'root'}-${index}`}><span>المستوى {index + 1}</span><select value="" disabled><option value="">لا توجد أصول مؤهلة في هذا الفرع</option></select></label>
        return <label key={`${level.parentId ?? 'root'}-${index}`}>
          <span>المستوى {index + 1}</span>
          <select value={selectedCode} onChange={e => choose(index, e.target.value)}>
            <option value="">{index === 0 ? placeholder : 'اختر فرعًا أو أصلًا'}</option>
            {level.groups.length > 0 && <optgroup label="المجموعات">{level.groups.map(group => <option key={group.id} value={`g:${group.id}`}>← {group.name}</option>)}</optgroup>}
            {level.assets.length > 0 && <optgroup label="الأصول">{level.assets.map(asset => <option key={asset.id} value={`a:${asset.id}`}>{asset.name} — {asset.quantity.toLocaleString('ar-SA')} {asset.nativeUnit}</option>)}</optgroup>}
          </select>
        </label>
      })}
    </div>
  </div>
}
