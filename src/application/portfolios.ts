import type { FinanceState, PortfolioProfile } from '../domain/types'

function descendantsOf(state: FinanceState, portfolioId: string): Set<string> {
  const result = new Set<string>()
  const walk = (id: string) => state.portfolios.filter(p => p.parentId === id && p.status === 'active').forEach(child => { if (!result.has(child.id)) { result.add(child.id); walk(child.id) } })
  walk(portfolioId)
  return result
}

export interface UpdatePortfolioInput {
  id: string
  name: string
  ownerId: string
  parentId?: string
  profile?: PortfolioProfile
  purpose?: string
  targetValueSar?: number
  dueDate?: string
  settlementAssetSymbol?: string
  protectionMode?: 'flexible' | 'designated' | 'hard_reserved' | 'instrument_bound'
}

export function updatePortfolio(state: FinanceState, input: UpdatePortfolioInput): FinanceState {
  const portfolio = state.portfolios.find(p => p.id === input.id && p.status === 'active')
  if (!portfolio) throw new Error('المحفظة غير موجودة أو غير نشطة')
  const name = input.name.trim()
  if (!name) throw new Error('اسم المحفظة مطلوب')
  if (!state.parties.some(p => p.id === input.ownerId)) throw new Error('المالك غير موجود')
  if (input.parentId === portfolio.id) throw new Error('لا يمكن أن تكون المحفظة أبًا لنفسها')
  if (input.parentId && descendantsOf(state, portfolio.id).has(input.parentId)) throw new Error('لا يمكن نقل المحفظة داخل أحد فروعها')
  if (input.parentId && !state.portfolios.some(p => p.id === input.parentId && p.status === 'active')) throw new Error('المحفظة الأب غير موجودة')
  if (input.targetValueSar != null && (!Number.isFinite(input.targetValueSar) || input.targetValueSar < 0)) throw new Error('الهدف لا يمكن أن يكون سالبًا')

  const oldOwnerIds = new Set(portfolio.ownerIds)
  const ownerChanged = portfolio.ownerIds.length !== 1 || !oldOwnerIds.has(input.ownerId)
  let slices = state.portfolioSlices
  let positions = state.positions ?? []
  let cycles = state.capitalCycles ?? []
  if (ownerChanged) {
    const portfolioSlices = slices.filter(s => s.portfolioId === portfolio.id)
    for (const slice of portfolioSlices) {
      const asset = state.holdings.find(h => h.id === slice.holdingId && !h.archived)
      const owned = asset?.ownership.find(o => o.ownerId === input.ownerId)?.quantity ?? 0
      const required = portfolioSlices.filter(s => s.holdingId === slice.holdingId).reduce((sum, s) => sum + s.quantity, 0)
      if (owned + 1e-9 < required) throw new Error(`لا يمكن تغيير مالك المحفظة؛ المالك الجديد لا يملك الكمية المخصصة من «${asset?.name ?? slice.holdingId}»`)
    }
    slices = slices.map(s => s.portfolioId === portfolio.id ? { ...s, ownerId: input.ownerId } : s)
    positions = positions.map(p => p.portfolioId === portfolio.id ? { ...p, ownerId: input.ownerId } : p)
    cycles = cycles.map(c => c.portfolioId === portfolio.id ? { ...c, ownerId: input.ownerId } : c)
  }

  return {
    ...state,
    schemaVersion: 5,
    portfolios: state.portfolios.map(p => p.id === portfolio.id ? {
      ...p,
      name,
      ownerIds: [input.ownerId],
      parentId: input.parentId || undefined,
      profile: input.profile,
      purpose: input.purpose?.trim() || undefined,
      targetValueSar: input.targetValueSar,
      dueDate: input.dueDate || undefined,
      settlementAssetSymbol: input.settlementAssetSymbol?.trim().toUpperCase() || undefined,
      protectionMode: input.protectionMode ?? p.protectionMode ?? 'flexible',
    } : p),
    portfolioSlices: slices,
    positions,
    capitalCycles: cycles,
  }
}

/**
 * User-facing delete for a purpose bucket. Allocation slices are logical, so deleting
 * the portfolio releases them to free liquidity. Historical transactions/positions
 * keep their portfolioId for audit even though the portfolio is archived.
 */
export function archivePortfolio(state: FinanceState, portfolioId: string): FinanceState {
  const portfolio = state.portfolios.find(p => p.id === portfolioId && p.status === 'active')
  if (!portfolio) throw new Error('المحفظة غير موجودة أو غير نشطة')
  if (state.portfolios.some(p => p.status === 'active' && p.parentId === portfolioId)) throw new Error('انقل أو احذف المحافظ الفرعية أولًا')
  return {
    ...state,
    schemaVersion: 5,
    portfolios: state.portfolios.map(p => p.id === portfolioId ? { ...p, status: 'archived' } : p),
    portfolioSlices: state.portfolioSlices.filter(s => s.portfolioId !== portfolioId),
  }
}
