import { addAccount, type AddAccountInput } from './commands'
import type { AccountGroup, FinanceState } from '../domain/types'

const id = () => `ag-${crypto.randomUUID()}`
const now = () => new Date().toISOString()
const groups = (state: FinanceState) => state.accountGroups ?? []

function descendantsOf(state: FinanceState, groupId: string): Set<string> {
  const result = new Set<string>()
  const all = groups(state)
  const walk = (parentId: string) => {
    all.filter(g => g.parentId === parentId).forEach(child => {
      if (!result.has(child.id)) { result.add(child.id); walk(child.id) }
    })
  }
  walk(groupId)
  return result
}

export interface CreateAccountGroupInput {
  name: string
  parentId?: string
  description?: string
}

export function createAccountGroup(state: FinanceState, input: CreateAccountGroupInput): FinanceState {
  const name = input.name.trim()
  if (!name) throw new Error('اسم المجموعة مطلوب')
  if (input.parentId && !groups(state).some(g => g.id === input.parentId && g.status === 'active')) throw new Error('المجموعة الأب غير موجودة أو مؤرشفة')
  if (groups(state).some(g => g.status === 'active' && g.parentId === input.parentId && g.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد مجموعة بنفس الاسم في هذا المستوى')
  const group: AccountGroup = { id: id(), name, parentId: input.parentId || undefined, description: input.description?.trim() || undefined, status: 'active', createdAt: now() }
  return { ...state, accountGroups: [...groups(state), group] }
}

export interface UpdateAccountGroupInput extends CreateAccountGroupInput { id: string }

export function updateAccountGroup(state: FinanceState, input: UpdateAccountGroupInput): FinanceState {
  const all = groups(state)
  if (!all.some(g => g.id === input.id)) throw new Error('المجموعة غير موجودة')
  const name = input.name.trim()
  if (!name) throw new Error('اسم المجموعة مطلوب')
  if (input.parentId === input.id) throw new Error('لا يمكن أن تكون المجموعة أبًا لنفسها')
  if (input.parentId && descendantsOf(state, input.id).has(input.parentId)) throw new Error('لا يمكن نقل المجموعة داخل أحد فروعها')
  if (input.parentId && !all.some(g => g.id === input.parentId && g.status === 'active')) throw new Error('المجموعة الأب غير موجودة أو مؤرشفة')
  if (all.some(g => g.id !== input.id && g.status === 'active' && g.parentId === input.parentId && g.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد مجموعة بنفس الاسم في هذا المستوى')
  return { ...state, accountGroups: all.map(g => g.id === input.id ? { ...g, name, parentId: input.parentId || undefined, description: input.description?.trim() || undefined } : g) }
}

export function archiveAccountGroup(state: FinanceState, groupId: string): FinanceState {
  const all = groups(state)
  if (!all.some(g => g.id === groupId)) throw new Error('المجموعة غير موجودة')
  if (all.some(g => g.status === 'active' && g.parentId === groupId)) throw new Error('انقل أو أرشف المجموعات الفرعية أولًا')
  if (state.accounts.some(a => a.status === 'active' && a.groupId === groupId)) throw new Error('انقل الحسابات خارج المجموعة أولًا')
  return { ...state, accountGroups: all.map(g => g.id === groupId ? { ...g, status: 'archived' } : g) }
}

export function moveAccountToGroup(state: FinanceState, accountId: string, groupId?: string): FinanceState {
  const account = state.accounts.find(a => a.id === accountId)
  if (!account) throw new Error('الحساب غير موجود')
  if (groupId && !groups(state).some(g => g.id === groupId && g.status === 'active')) throw new Error('المجموعة غير موجودة أو مؤرشفة')
  return { ...state, accounts: state.accounts.map(a => a.id === accountId ? { ...a, groupId: groupId || undefined } : a) }
}

export interface CreateGroupedAccountInput extends Omit<AddAccountInput, 'custodianId'> {
  groupId?: string
}

/** Account is the real container. The old custodian field is schema-v4 compatibility only. */
export function createGroupedAccount(state: FinanceState, input: CreateGroupedAccountInput): FinanceState {
  if (input.groupId && !groups(state).some(g => g.id === input.groupId && g.status === 'active')) throw new Error('المجموعة غير موجودة أو مؤرشفة')
  const selfId = state.parties.find(p => p.type === 'self')?.id ?? state.parties[0]?.id
  if (!selfId) throw new Error('لا توجد هوية مالك أساسية في النظام')
  const next = addAccount(state, { ...input, custodianId: selfId })
  const created = next.accounts[next.accounts.length - 1]
  return input.groupId ? moveAccountToGroup(next, created.id, input.groupId) : next
}
