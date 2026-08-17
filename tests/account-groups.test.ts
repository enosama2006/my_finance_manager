import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { createAccountGroup, createGroupedAccount, moveAccountToGroup, archiveAccountGroup, updateAccount } from '../src/application/accountGroups'
import { addFunds } from '../src/application/commands'
import { SELF_ID } from '../src/data/seed'

const clone = <T,>(value: T): T => structuredClone(value)

describe('account groups', () => {
  it('creates an account inside a user group without creating a place', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    const group = state.accountGroups![0]
    state = createGroupedAccount(state, { name: 'الراجحي الجاري', kind: 'checking', groupId: group.id, currency: 'SAR' })

    expect(state.accountGroups).toHaveLength(1)
    expect(state.accounts).toHaveLength(1)
    expect(state.accounts[0].groupId).toBe(group.id)
    expect(state.parties).toEqual(emptyState.parties)
    expect(state.holdings).toHaveLength(0)
    expect(state.ledger).toHaveLength(0)
  })

  it('allows an account to exist without any group', () => {
    const state = createGroupedAccount(clone(emptyState), { name: 'حساب مستقل', kind: 'checking', currency: 'SAR' })
    expect(state.accounts[0].groupId).toBeUndefined()
    expect(state.accountGroups).toHaveLength(0)
  })

  it('moves an account between groups without changing financial truth', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    state = createAccountGroup(state, { name: 'الاستثمارات' })
    const [banks, investments] = state.accountGroups!
    state = createGroupedAccount(state, { name: 'الراجحي الاستثماري', kind: 'investment', groupId: banks.id, currency: 'SAR' })
    const accountId = state.accounts[0].id
    const beforeHoldings = structuredClone(state.holdings)
    const beforeLedger = structuredClone(state.ledger)

    state = moveAccountToGroup(state, accountId, investments.id)

    expect(state.accounts[0].groupId).toBe(investments.id)
    expect(state.holdings).toEqual(beforeHoldings)
    expect(state.ledger).toEqual(beforeLedger)
  })

  it('does not archive a group while active accounts are still assigned to it', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'المنزل' })
    const group = state.accountGroups![0]
    state = createGroupedAccount(state, { name: 'الخزنة', kind: 'cash_container', groupId: group.id, currency: 'SAR' })
    expect(() => archiveAccountGroup(state, group.id)).toThrow('انقل الحسابات خارج المجموعة أولًا')
  })

  it('edits account metadata without rewriting holdings or ledger history', () => {
    let state = clone(emptyState)
    state = createAccountGroup(state, { name: 'البنوك' })
    state = createAccountGroup(state, { name: 'الحسابات اليومية' })
    const [banks, daily] = state.accountGroups!
    state = createGroupedAccount(state, { name: 'الراجحي', kind: 'checking', groupId: banks.id, currency: 'SAR', last4: '1234' })
    const accountId = state.accounts[0].id
    state = addFunds(state, { accountId, ownerId: SELF_ID, symbol: 'SAR', nativeUnit: 'SAR', quantity: 1000, unitCostSar: 1, marketPriceSar: 1, classification: 'opening' })
    const beforeHoldings = structuredClone(state.holdings)
    const beforeLedger = structuredClone(state.ledger)

    state = updateAccount(state, { id: accountId, name: 'الراجحي الرئيسي', kind: 'saving', currency: 'sar', last4: '9876', groupId: daily.id })

    expect(state.accounts[0].id).toBe(accountId)
    expect(state.accounts[0].name).toBe('الراجحي الرئيسي')
    expect(state.accounts[0].kind).toBe('saving')
    expect(state.accounts[0].currency).toBe('SAR')
    expect(state.accounts[0].last4).toBe('9876')
    expect(state.accounts[0].groupId).toBe(daily.id)
    expect(state.holdings).toEqual(beforeHoldings)
    expect(state.ledger).toEqual(beforeLedger)
  })

  it('blocks changing a funded account across the credit-card semantic boundary', () => {
    let state = createGroupedAccount(clone(emptyState), { name: 'جاري', kind: 'checking', currency: 'SAR' })
    const accountId = state.accounts[0].id
    state = addFunds(state, { accountId, ownerId: SELF_ID, symbol: 'SAR', nativeUnit: 'SAR', quantity: 500, unitCostSar: 1, marketPriceSar: 1, classification: 'opening' })

    expect(() => updateAccount(state, { id: accountId, name: 'بطاقة', kind: 'credit_card', currency: 'SAR' }))
      .toThrow('لا يمكن تحويل حساب عليه أرصدة إلى بطاقة ائتمان أو العكس')
  })
})
