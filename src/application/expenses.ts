import { availableQuantity, ownerQuantity, round2 } from '../domain/finance'
import type { ExpenseBeneficiary, ExpenseBeneficiaryKind, ExpenseCategory, ExpenseNecessity, FinanceState, Holding, LedgerTransaction, Party } from '../domain/types'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const now = () => new Date().toISOString()

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} يجب أن يكون أكبر من صفر`)
}
function categories(state: FinanceState) { return state.expenseCategories ?? [] }
function beneficiaries(state: FinanceState) { return state.expenseBeneficiaries ?? [] }

function baseExpenseTx(title: string, amountSar: number, ownerId: string): LedgerTransaction {
  return { id: id('tx'), version: 1, status: 'posted', revisions: [], at: now(), kind: 'expense', title, amountSar: round2(amountSar), ownerId }
}

export interface CreatePartyInput { name: string; type: Party['type'] }
export function createParty(state: FinanceState, input: CreatePartyInput): FinanceState {
  const name = input.name.trim()
  if (!name) throw new Error('اسم الجهة مطلوب')
  const duplicate = state.parties.find(p => p.name.trim().toLowerCase() === name.toLowerCase() && p.type === input.type)
  if (duplicate) throw new Error('هذه الجهة موجودة بالفعل')
  return { ...state, parties: [...state.parties, { id: id('party'), name, type: input.type }] }
}

export interface CreateExpenseCategoryInput {
  name: string
  parentId?: string
  description?: string
  defaultNecessity?: ExpenseNecessity
}

export function createExpenseCategory(state: FinanceState, input: CreateExpenseCategoryInput): FinanceState {
  const name = input.name.trim()
  if (!name) throw new Error('اسم بند الصرف مطلوب')
  if (input.parentId) {
    const parent = categories(state).find(c => c.id === input.parentId && c.status === 'active')
    if (!parent) throw new Error('البند الأب غير موجود أو مؤرشف')
  }
  const duplicate = categories(state).find(c => c.status === 'active' && c.parentId === input.parentId && c.name.trim().toLowerCase() === name.toLowerCase())
  if (duplicate) throw new Error('يوجد بند بنفس الاسم تحت هذا المستوى')
  const category: ExpenseCategory = {
    id: id('cat'), name, parentId: input.parentId || undefined, status: 'active',
    description: input.description?.trim() || undefined,
    defaultNecessity: input.defaultNecessity,
    createdAt: now(),
  }
  return { ...state, expenseCategories: [...categories(state), category] }
}

function descendantsOf(state: FinanceState, categoryId: string): Set<string> {
  const result = new Set<string>()
  const all = categories(state)
  const walk = (idValue: string) => {
    all.filter(c => c.parentId === idValue).forEach(child => {
      if (!result.has(child.id)) { result.add(child.id); walk(child.id) }
    })
  }
  walk(categoryId)
  return result
}

export function expenseCategoryEffectiveNecessity(state: FinanceState, categoryId: string): ExpenseNecessity | undefined {
  const all = categories(state)
  let current = all.find(c => c.id === categoryId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    if (current.defaultNecessity) return current.defaultNecessity
    current = current.parentId ? all.find(c => c.id === current!.parentId) : undefined
  }
  return undefined
}

export interface UpdateExpenseCategoryInput {
  id: string
  name: string
  parentId?: string
  description?: string
  defaultNecessity?: ExpenseNecessity
}

export function updateExpenseCategory(state: FinanceState, input: UpdateExpenseCategoryInput): FinanceState {
  const all = categories(state)
  const current = all.find(c => c.id === input.id)
  if (!current) throw new Error('بند الصرف غير موجود')
  const name = input.name.trim()
  if (!name) throw new Error('اسم بند الصرف مطلوب')
  if (input.parentId === input.id) throw new Error('لا يمكن أن يكون البند أبًا لنفسه')
  const descendants = descendantsOf(state, input.id)
  if (input.parentId && descendants.has(input.parentId)) throw new Error('لا يمكن نقل البند تحت أحد فروعه')
  if (input.parentId && !all.some(c => c.id === input.parentId && c.status === 'active')) throw new Error('البند الأب غير موجود أو مؤرشف')
  const duplicate = all.find(c => c.id !== input.id && c.status === 'active' && c.parentId === input.parentId && c.name.trim().toLowerCase() === name.toLowerCase())
  if (duplicate) throw new Error('يوجد بند بنفس الاسم تحت هذا المستوى')
  return {
    ...state,
    expenseCategories: all.map(c => c.id === input.id ? {
      ...c, name, parentId: input.parentId || undefined,
      description: input.description?.trim() || undefined,
      defaultNecessity: input.defaultNecessity,
    } : c),
  }
}

export function archiveExpenseCategory(state: FinanceState, categoryId: string): FinanceState {
  const all = categories(state)
  const current = all.find(c => c.id === categoryId)
  if (!current) throw new Error('بند الصرف غير موجود')
  if (all.some(c => c.parentId === categoryId && c.status === 'active')) throw new Error('انقل أو أرشف الفروع التابعة أولًا')
  return { ...state, expenseCategories: all.map(c => c.id === categoryId ? { ...c, status: 'archived' } : c) }
}

export interface CreateExpenseBeneficiaryInput {
  name: string
  kind: ExpenseBeneficiaryKind
  description?: string
}
export interface UpdateExpenseBeneficiaryInput extends CreateExpenseBeneficiaryInput { id: string }

export function createExpenseBeneficiary(state: FinanceState, input: CreateExpenseBeneficiaryInput): FinanceState {
  const name = input.name.trim()
  if (!name) throw new Error('اسم المستفيد مطلوب')
  if (beneficiaries(state).some(b => b.status === 'active' && b.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('هذا المستفيد موجود بالفعل')
  const beneficiaryId = id('beneficiary')
  const beneficiary: ExpenseBeneficiary = {
    id: beneficiaryId, name, kind: input.kind, status: 'active',
    description: input.description?.trim() || undefined, createdAt: now(),
  }
  // RULE-027: Beneficiary is a role over a Party identity, not a second identity store.
  // Mirror the beneficiary into state.parties so any FK to the beneficiary id resolves inside
  // the canonical Party store. Full de-duplication against existing Party rows by name is the
  // Family-C follow-up covered by INV-020 sub-test 1.
  const partyType = input.kind === 'person' ? 'person' : 'group'
  const mirroredParty = { id: beneficiaryId, name, type: partyType as const }
  return { ...state, parties: [...state.parties, mirroredParty], expenseBeneficiaries: [...beneficiaries(state), beneficiary] }
}

export function updateExpenseBeneficiary(state: FinanceState, input: UpdateExpenseBeneficiaryInput): FinanceState {
  const all = beneficiaries(state)
  const current = all.find(b => b.id === input.id)
  if (!current) throw new Error('المستفيد غير موجود')
  const name = input.name.trim()
  if (!name) throw new Error('اسم المستفيد مطلوب')
  if (all.some(b => b.id !== input.id && b.status === 'active' && b.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('يوجد مستفيد بنفس الاسم')
  return { ...state, expenseBeneficiaries: all.map(b => b.id === input.id ? { ...b, name, kind: input.kind, description: input.description?.trim() || undefined } : b) }
}

export function archiveExpenseBeneficiary(state: FinanceState, beneficiaryId: string): FinanceState {
  if (!beneficiaries(state).some(b => b.id === beneficiaryId)) throw new Error('المستفيد غير موجود')
  return { ...state, expenseBeneficiaries: beneficiaries(state).map(b => b.id === beneficiaryId ? { ...b, status: 'archived' } : b) }
}

function reduceOwnerLots(holding: Holding, ownerId: string, quantity: number) {
  const lots = holding.costLots.filter(l => l.ownerId === ownerId)
  const total = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  if (quantity > total + 1e-9) throw new Error('تكلفة الأصل لا تغطي كمية الصرف')
  const remaining = Math.max(0, total - quantity)
  if (remaining <= 1e-9) return holding.costLots.filter(l => l.ownerId !== ownerId)
  let assigned = 0
  let seen = 0
  return holding.costLots.map(lot => {
    if (lot.ownerId !== ownerId) return lot
    seen += 1
    const nextQuantity = seen === lots.length ? round2(remaining - assigned) : round2((lot.quantity / total) * remaining)
    assigned = round2(assigned + nextQuantity)
    return { ...lot, quantity: nextQuantity }
  }).filter(lot => lot.quantity > 0)
}

function debitHolding(holding: Holding, ownerId: string, quantity: number): Holding {
  if (quantity > ownerQuantity(holding, ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  return {
    ...holding,
    quantity: round2(holding.quantity - quantity),
    ownership: holding.ownership.map(s => s.ownerId === ownerId ? { ...s, quantity: round2(s.quantity - quantity) } : s).filter(s => s.quantity > 0),
    costLots: reduceOwnerLots(holding, ownerId, quantity),
  }
}

function portfolioAllocatedValueSar(state: FinanceState, portfolioId: string, ownerId: string): number {
  return round2(state.portfolioSlices.filter(s => s.portfolioId === portfolioId && s.ownerId === ownerId).reduce((sum, slice) => {
    const holding = state.holdings.find(h => h.id === slice.holdingId && !h.archived)
    return sum + (holding ? slice.quantity * holding.marketPriceSar : 0)
  }, 0))
}

function consumePortfolioValue(state: FinanceState, portfolioId: string, ownerId: string, amountSar: number, preferredHoldingId: string): FinanceState {
  const portfolio = state.portfolios.find(p => p.id === portfolioId && p.status === 'active')
  if (!portfolio) throw new Error('المحفظة غير موجودة أو مغلقة')
  if (!portfolio.ownerIds.includes(ownerId)) throw new Error('هذه المحفظة لا تخص المالك المحدد')
  const coverage = portfolioAllocatedValueSar(state, portfolioId, ownerId)
  if (amountSar > coverage + 0.01) throw new Error(`رصيد المحفظة غير كافٍ. المتاح اقتصاديًا ${coverage.toLocaleString('ar-SA')} ر.س`)

  const relevant = state.portfolioSlices
    .filter(s => s.portfolioId === portfolioId && s.ownerId === ownerId && s.quantity > 0)
    .map(s => ({ slice: s, holding: state.holdings.find(h => h.id === s.holdingId && !h.archived) }))
    .filter((x): x is { slice: FinanceState['portfolioSlices'][number]; holding: Holding } => Boolean(x.holding))
    .sort((a, b) => {
      const aRank = a.holding.id === preferredHoldingId ? 0 : a.holding.kind === 'cash' ? 1 : 2
      const bRank = b.holding.id === preferredHoldingId ? 0 : b.holding.kind === 'cash' ? 1 : 2
      return aRank - bRank
    })

  let remainingSar = amountSar
  const remainingBySlice = new Map<string, number>()
  for (const { slice, holding } of relevant) {
    if (remainingSar <= 0.005) break
    const price = holding.marketPriceSar
    if (price <= 0) continue
    const sliceValue = slice.quantity * price
    const usedValue = Math.min(sliceValue, remainingSar)
    const usedQty = Math.min(slice.quantity, usedValue / price)
    remainingBySlice.set(slice.id, Math.max(0, slice.quantity - usedQty))
    remainingSar -= usedQty * price
  }
  if (remainingSar > 0.05) throw new Error('تعذر استهلاك رصيد المحفظة بدقة؛ راجع تقييم الأصول المخصصة')
  return { ...state, portfolioSlices: state.portfolioSlices.map(s => remainingBySlice.has(s.id) ? { ...s, quantity: Math.max(0, remainingBySlice.get(s.id) ?? 0) } : s).filter(s => s.quantity > 1e-9) }
}

export interface SpendExpenseInput {
  sourceHoldingId: string
  ownerId: string
  quantity: number
  expenseCategoryId: string
  portfolioId?: string
  expenseNecessity?: ExpenseNecessity
  expenseBeneficiaryId?: string
  title?: string
  note?: string
}

export function spendExpense(state: FinanceState, input: SpendExpenseInput): FinanceState {
  positive(input.quantity, 'قيمة/كمية الصرف')
  const category = categories(state).find(c => c.id === input.expenseCategoryId && c.status === 'active')
  if (!category) throw new Error('اختر بند صرف نشطًا')
  if (input.expenseBeneficiaryId && !beneficiaries(state).some(b => b.id === input.expenseBeneficiaryId && b.status === 'active')) throw new Error('المستفيد غير موجود أو مؤرشف')
  const source = state.holdings.find(h => h.id === input.sourceHoldingId && !h.archived)
  if (!source) throw new Error('مصدر الدفع غير موجود')
  if (source.kind !== 'cash') throw new Error('المصروف النقدي يجب أن يخرج من رصيد نقد/عملة')
  if (input.quantity > ownerQuantity(source, input.ownerId) + 1e-9) throw new Error('الرصيد غير كافٍ')
  const amountSar = round2(input.quantity * source.marketPriceSar)

  let next = state
  if (input.portfolioId) {
    const allocatedOnSourceToOtherPortfolios = state.portfolioSlices.filter(s => s.holdingId === source.id && s.ownerId === input.ownerId && s.portfolioId !== input.portfolioId).reduce((sum, s) => sum + s.quantity, 0)
    const physicalSpendable = ownerQuantity(source, input.ownerId) - allocatedOnSourceToOtherPortfolios
    if (input.quantity > physicalSpendable + 1e-9) throw new Error('مصدر الدفع يحتوي قيمة محجوزة لمحافظ أخرى؛ اختر مصدرًا حرًا أو من نفس المحفظة')
    next = consumePortfolioValue(next, input.portfolioId, input.ownerId, amountSar, source.id)
  } else {
    const free = availableQuantity(state, source.id, input.ownerId)
    if (input.quantity > free + 1e-9) throw new Error('السيولة الحرة في مصدر الدفع غير كافية؛ اختر محفظة أو مصدرًا آخر')
  }

  const debitedSource = debitHolding(source, input.ownerId, input.quantity)
  next = { ...next, holdings: next.holdings.map(h => h.id === source.id ? debitedSource : h) }
  const tx: LedgerTransaction = {
    ...baseExpenseTx(input.title?.trim() || category.name, amountSar, input.ownerId),
    sourceHoldingId: source.id,
    sourceQuantity: input.quantity,
    portfolioId: input.portfolioId,
    expenseCategoryId: category.id,
    expenseNecessity: input.expenseNecessity ?? expenseCategoryEffectiveNecessity(state, category.id),
    expenseBeneficiaryId: input.expenseBeneficiaryId,
    note: input.note?.trim() || (input.portfolioId ? 'مصروف مرتبط بمحفظة: خرج فعليًا من الحساب واستهلك من التخصيص الاقتصادي للمحفظة.' : 'مصروف غير مرتبط بمحفظة: استُهلك من السيولة الحرة.'),
  }
  return { ...next, ledger: [tx, ...next.ledger] }
}

export function expenseCategorySubtreeIds(state: FinanceState, rootId: string): Set<string> { return new Set([rootId, ...descendantsOf(state, rootId)]) }
export function expenseCategorySpentSar(state: FinanceState, rootId: string): number {
  const ids = expenseCategorySubtreeIds(state, rootId)
  return round2(state.ledger.filter(tx => tx.kind === 'expense' && tx.expenseCategoryId && ids.has(tx.expenseCategoryId)).reduce((sum, tx) => sum + tx.amountSar, 0))
}
