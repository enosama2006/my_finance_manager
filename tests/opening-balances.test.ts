import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { addFunds } from '../src/application/commands'
import { createGroupedAccount } from '../src/application/accountGroups'
import { openingBalanceInfo, setOpeningBalance, voidOpeningBalance } from '../src/application/openingBalances'

const clone = <T,>(value: T): T => structuredClone(value)

function setup() {
  let state = clone(emptyState)
  state = createGroupedAccount(state, { name: 'الراجحي الجاري', kind: 'checking', currency: 'SAR' })
  return { state, accountId: state.accounts[0].id, ownerId: state.parties.find(p => p.type === 'self')!.id }
}

function input(accountId: string, ownerId: string, quantity: number) {
  return { accountId, ownerId, symbol: 'SAR', nativeUnit: 'SAR', quantity, unitCostSar: 1, marketPriceSar: 1 }
}

describe('opening balance single-entry policy', () => {
  it('updates the same opening balance instead of creating a second active opening transaction', () => {
    let { state, accountId, ownerId } = setup()
    state = setOpeningBalance(state, input(accountId, ownerId, 1000))
    state = setOpeningBalance(state, input(accountId, ownerId, 1200))

    const active = state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted')
    expect(active).toHaveLength(1)
    expect(active[0].targetQuantity).toBe(1200)
    expect(active[0].version).toBe(2)
    expect(active[0].revisions).toHaveLength(1)
    expect(state.holdings[0].quantity).toBe(1200)
    expect(openingBalanceInfo(state, accountId, ownerId, 'SAR').quantity).toBe(1200)
  })

  it('consolidates three accidental legacy opening entries into one desired opening balance and reverses the extra balance', () => {
    let { state, accountId, ownerId } = setup()
    const legacy = { ...input(accountId, ownerId, 1000), classification: 'opening' as const }
    state = addFunds(state, legacy)
    state = addFunds(state, legacy)
    state = addFunds(state, legacy)
    expect(state.holdings[0].quantity).toBe(3000)
    expect(state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted')).toHaveLength(3)

    state = setOpeningBalance(state, input(accountId, ownerId, 1000))

    expect(state.holdings[0].quantity).toBe(1000)
    expect(state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'posted')).toHaveLength(1)
    expect(state.ledger.filter(tx => tx.kind === 'opening' && tx.status === 'voided')).toHaveLength(2)
    expect(openingBalanceInfo(state, accountId, ownerId, 'SAR')).toMatchObject({ exists: true, quantity: 1000, count: 1 })
  })

  it('voids an opening balance by reversing its real holding effect while retaining the ledger record', () => {
    let { state, accountId, ownerId } = setup()
    state = setOpeningBalance(state, input(accountId, ownerId, 1000))
    const txId = state.ledger.find(tx => tx.kind === 'opening' && tx.status === 'posted')!.id

    state = voidOpeningBalance(state, txId, 'إدخال خاطئ')

    expect(state.holdings[0].quantity).toBe(0)
    expect(state.ledger.find(tx => tx.id === txId)?.status).toBe('voided')
    expect(state.ledger.find(tx => tx.id === txId)?.revisions).toHaveLength(1)
    expect(openingBalanceInfo(state, accountId, ownerId, 'SAR').exists).toBe(false)
  })

  it('keeps income repeatable because only opening balance is single-entry', () => {
    let { state, accountId, ownerId } = setup()
    const income = { ...input(accountId, ownerId, 1000), classification: 'income' as const }
    state = addFunds(state, income)
    state = addFunds(state, income)

    expect(state.ledger.filter(tx => tx.kind === 'income' && tx.status === 'posted')).toHaveLength(2)
    expect(state.holdings[0].quantity).toBe(2000)
  })
})
