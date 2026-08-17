import { describe, expect, it } from 'vitest'
import { emptyState } from '../src/data/emptyState'
import { createAccountGroup, createGroupedAccount, moveAccountToGroup, archiveAccountGroup } from '../src/application/accountGroups'

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
})
