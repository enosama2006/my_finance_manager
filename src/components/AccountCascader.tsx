import { useEffect, useMemo, useState } from 'react'
import type { Account, AccountGroup, FinanceState } from '../domain/types'

type NodeChoice = { type: 'group'; id: string; label: string } | { type: 'account'; id: string; label: string }

const UNGROUPED = '__ungrouped__'

function groupPath(groups: AccountGroup[], groupId?: string): AccountGroup[] {
  if (!groupId) return []
  const path: AccountGroup[] = []
  const seen = new Set<string>()
  let current = groups.find(g => g.id === groupId)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = current.parentId ? groups.find(g => g.id === current!.parentId) : undefined
  }
  return path
}

function roots(groups: AccountGroup[]) {
  return groups.filter(g => !g.parentId || !groups.some(parent => parent.id === g.parentId))
}

function choicesForGroup(groups: AccountGroup[], accounts: Account[], groupId: string): NodeChoice[] {
  return [
    ...groups.filter(g => g.parentId === groupId).map(g => ({ type: 'group' as const, id: g.id, label: g.name })),
    ...accounts.filter(a => a.groupId === groupId).map(a => ({ type: 'account' as const, id: a.id, label: a.name })),
  ]
}

export function AccountCascader({
  state,
  accounts,
  value,
  onChange,
  label = 'الحساب / الوعاء',
  helper,
}: {
  state: FinanceState
  accounts: Account[]
  value: string
  onChange: (accountId: string) => void
  label?: string
  helper?: string
}) {
  const groups = useMemo(() => (state.accountGroups ?? []).filter(g => g.status === 'active'), [state.accountGroups])
  const eligible = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts])
  const selectedAccount = eligible.find(a => a.id === value)
  const selectedPath = groupPath(groups, selectedAccount?.groupId)

  const initialGroupPath = selectedAccount?.groupId ? selectedPath.map(g => g.id) : selectedAccount ? [UNGROUPED] : []
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialGroupPath)

  useEffect(() => {
    if (!selectedAccount) return
    setSelectedGroups(selectedAccount.groupId ? groupPath(groups, selectedAccount.groupId).map(g => g.id) : [UNGROUPED])
  }, [selectedAccount?.id, selectedAccount?.groupId, groups])

  const rootGroups = roots(groups)
  const ungroupedAccounts = eligible.filter(a => !a.groupId || !groups.some(g => g.id === a.groupId))
  const rootValue = selectedGroups[0] ?? ''

  const chooseRoot = (next: string) => {
    setSelectedGroups(next ? [next] : [])
    onChange('')
  }

  const chooseLevel = (level: number, raw: string) => {
    if (!raw) {
      setSelectedGroups(prev => prev.slice(0, level + 1))
      onChange('')
      return
    }
    const [type, id] = raw.split(':', 2)
    if (type === 'a') {
      onChange(id)
      return
    }
    if (type === 'g') {
      setSelectedGroups(prev => [...prev.slice(0, level + 1), id])
      onChange('')
    }
  }

  const breadcrumb = selectedAccount
    ? [...selectedPath.map(g => g.name), selectedAccount.name].join(' ← ') || selectedAccount.name
    : selectedGroups.length
      ? selectedGroups.map(id => id === UNGROUPED ? 'بدون مجموعة' : groups.find(g => g.id === id)?.name).filter(Boolean).join(' ← ')
      : 'لم يتم اختيار حساب'

  const levels: { parentId: string; options: NodeChoice[] }[] = []
  if (rootValue === UNGROUPED) {
    levels.push({ parentId: UNGROUPED, options: ungroupedAccounts.map(a => ({ type: 'account', id: a.id, label: a.name })) })
  } else if (rootValue) {
    selectedGroups.filter(id => id !== UNGROUPED).forEach(groupId => {
      levels.push({ parentId: groupId, options: choicesForGroup(groups, eligible, groupId) })
    })
  }

  const selectedAccountRaw = selectedAccount ? `a:${selectedAccount.id}` : ''

  return <div className="parent-cascader account-cascader">
    <div className="cascader-label"><span>{label}</span><strong>{breadcrumb}</strong></div>
    <div className="cascader-levels">
      <label><span>المجموعة الرئيسية</span><select value={rootValue} onChange={e => chooseRoot(e.target.value)}>
        <option value="">اختر مجموعة</option>
        {rootGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        {ungroupedAccounts.length > 0 && <option value={UNGROUPED}>بدون مجموعة</option>}
      </select></label>
      {levels.map((level, index) => {
        const groupIndex = index + 1
        const nextSelectedGroup = selectedGroups[groupIndex]
        const selectedValue = selectedAccount && selectedGroups[selectedGroups.length - 1] === level.parentId
          ? selectedAccountRaw
          : nextSelectedGroup ? `g:${nextSelectedGroup}` : ''
        return <label key={`${level.parentId}-${index}`}><span>المستوى {index + 2}</span><select value={selectedValue} onChange={e => chooseLevel(index, e.target.value)}>
          <option value="">{level.options.length ? 'اختر مجموعة فرعية أو حسابًا' : 'لا توجد حسابات داخل هذه المجموعة'}</option>
          {level.options.map(option => <option key={`${option.type}-${option.id}`} value={`${option.type === 'group' ? 'g' : 'a'}:${option.id}`}>{option.type === 'group' ? `▸ ${option.label}` : option.label}</option>)}
        </select></label>
      })}
    </div>
    {helper && <small>{helper}</small>}
  </div>
}
