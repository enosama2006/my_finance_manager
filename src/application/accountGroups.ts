import { addAccount, type AddAccountInput } from './commands'
import { moveAssetToGroup } from './assets'
import type { AccountGroup, AccountKind, FinanceState } from '../domain/types'

const id = () => `ag-${crypto.randomUUID()}`
const now = () => new Date().toISOString()
const groups = (state: FinanceState) => state.accountGroups ?? []

function descendantsOf(state: FinanceState, groupId: string): Set<string> {
  const result = new Set<string>()
  const all = groups(state)
  const walk = (parentId: string) => { all.filter(g => g.parentId === parentId).forEach(child => { if (!result.has(child.id)) { result.add(child.id); walk(child.id) } }) }
  walk(groupId); return result
}

export interface CreateAccountGroupInput { name: string; parentId?: string; description?: string }
export function createAccountGroup(state: FinanceState, input: CreateAccountGroupInput): FinanceState {
  const name = input.name.trim(); if (!name) throw new Error('اسم المجموعة مطلوب')
  if (input.parentId && !groups(state).some(g => g.id === input.parentId && g.status === 'active')) throw new Error('المجموعة الأب غير موجودة أو مؤرشفة')
  if (groups(state).some(g => g.status === 'active' && g.parentId === input.parentId && g.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد مجموعة بنفس الاسم في هذا المستوى')
  const group: AccountGroup = { id: id(), name, parentId: input.parentId || undefined, description: input.description?.trim() || undefined, status: 'active', createdAt: now() }
  return { ...state, schemaVersion: 5, accountGroups: [...groups(state), group] }
}

export interface UpdateAccountGroupInput extends CreateAccountGroupInput { id: string }
export function updateAccountGroup(state: FinanceState, input: UpdateAccountGroupInput): FinanceState {
  const all = groups(state); if (!all.some(g => g.id === input.id)) throw new Error('المجموعة غير موجودة')
  const name = input.name.trim(); if (!name) throw new Error('اسم المجموعة مطلوب')
  if (input.parentId === input.id) throw new Error('لا يمكن أن تكون المجموعة أبًا لنفسها')
  if (input.parentId && descendantsOf(state, input.id).has(input.parentId)) throw new Error('لا يمكن نقل المجموعة داخل أحد فروعها')
  if (input.parentId && !all.some(g => g.id === input.parentId && g.status === 'active')) throw new Error('المجموعة الأب غير موجودة أو مؤرشفة')
  if (all.some(g => g.id !== input.id && g.status === 'active' && g.parentId === input.parentId && g.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد مجموعة بنفس الاسم في هذا المستوى')
  return { ...state, schemaVersion: 5, accountGroups: all.map(g => g.id === input.id ? { ...g, name, parentId: input.parentId || undefined, description: input.description?.trim() || undefined } : g) }
}

export function archiveAccountGroup(state: FinanceState, groupId: string): FinanceState {
  const all = groups(state); if (!all.some(g => g.id === groupId)) throw new Error('المجموعة غير موجودة')
  if (all.some(g => g.status === 'active' && g.parentId === groupId)) throw new Error('انقل أو احذف المجموعات الفرعية أولًا')
  if (state.holdings.some(a => !a.archived && a.groupId === groupId)) throw new Error('انقل أو احذف الأصول الموجودة داخل المجموعة أولًا')
  // Compatibility: schema-v4 Account rows can still point at a Group before normalization.
  if (state.accounts.some(a => a.status === 'active' && a.groupId === groupId)) throw new Error('انقل الحسابات خارج المجموعة أولًا')
  return { ...state, schemaVersion: 5, accountGroups: all.map(g => g.id === groupId ? { ...g, status: 'archived' } : g) }
}

export { moveAssetToGroup }

// Legacy Account API retained only for v4 import/tests. New UI does not call it.
export function moveAccountToGroup(state: FinanceState, accountId: string, groupId?: string): FinanceState {
  const account = state.accounts.find(a => a.id === accountId); if (!account) throw new Error('الحساب القديم غير موجود')
  if (groupId && !groups(state).some(g => g.id === groupId && g.status === 'active')) throw new Error('المجموعة غير موجودة أو مؤرشفة')
  return { ...state, accounts: state.accounts.map(a => a.id === accountId ? { ...a, groupId: groupId || undefined } : a) }
}

export interface CreateGroupedAccountInput extends Omit<AddAccountInput, 'custodianId'> { groupId?: string }
export function createGroupedAccount(state: FinanceState, input: CreateGroupedAccountInput): FinanceState {
  if (input.groupId && !groups(state).some(g => g.id === input.groupId && g.status === 'active')) throw new Error('المجموعة غير موجودة أو مؤرشفة')
  const selfId = state.parties.find(p => p.type === 'self')?.id ?? state.parties[0]?.id; if (!selfId) throw new Error('لا توجد هوية مالك أساسية في النظام')
  const next = addAccount(state, { ...input, custodianId: selfId }); const created = next.accounts[next.accounts.length - 1]
  return input.groupId ? moveAccountToGroup(next, created.id, input.groupId) : next
}

export interface UpdateAccountInput { id: string; name: string; kind: AccountKind; currency?: string; last4?: string; groupId?: string }
export function updateAccount(state: FinanceState, input: UpdateAccountInput): FinanceState {
  const account = state.accounts.find(a => a.id === input.id && a.status === 'active'); if (!account) throw new Error('الحساب القديم غير موجود أو غير نشط')
  const name = input.name.trim(); if (!name) throw new Error('اسم الحساب مطلوب')
  if (input.groupId && !groups(state).some(g => g.id === input.groupId && g.status === 'active')) throw new Error('المجموعة غير موجودة أو مؤرشفة')
  const last4 = input.last4?.trim() || undefined; if (last4 && !/^\d{1,4}$/.test(last4)) throw new Error('آخر 4 أرقام يجب أن تكون أرقامًا فقط')
  const funded = state.holdings.some(h => !h.archived && h.accountId === account.id && h.quantity > 0)
  const crossesCreditBoundary = (account.kind === 'credit_card') !== (input.kind === 'credit_card')
  if (funded && crossesCreditBoundary) throw new Error('لا يمكن تحويل حساب عليه أرصدة إلى بطاقة ائتمان أو العكس')
  return { ...state, accounts: state.accounts.map(a => a.id === account.id ? { ...a, name, kind: input.kind, currency: input.currency?.trim().toUpperCase() || undefined, last4, groupId: input.groupId || undefined } : a) }
}
