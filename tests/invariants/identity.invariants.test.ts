/**
 * INV-IDENTITY — one Party identity across every role, and lenses that read it correctly.
 * Authority: ENT-001, RULE-002, RULE-014, RULE-027, CALC-011, DEC-021/ADR-004.
 */
import { describe, expect, it } from 'vitest'
import { createAssetWithOpening } from '../../src/application/assetTransactions'
import { addExistingAsset } from '../../src/application/commands'
import { createExpenseBeneficiary, createParty } from '../../src/application/expenses'
import { holdingsInThirdPartyCustody, netWorthByOwner } from '../../src/domain/finance'
import type { Claim } from '../../src/domain/types'
import { freshState, SELF_ID } from './_harness'

describe('INV-020 — Owner and Beneficiary are roles over one Party identity (RULE-027)', () => {
  it('does not create a second identity record for a person who is already a Party', () => {
    let state = freshState()
    state = createParty(state, { name: 'مراد', type: 'person' })
    const murad = state.parties.find(p => p.name === 'مراد')!

    // The same human is now referenced as an expense beneficiary.
    state = createExpenseBeneficiary(state, { name: 'مراد', kind: 'person' })

    const identitiesForMurad = [
      ...state.parties.filter(p => p.name === 'مراد').map(p => p.id),
      ...(state.expenseBeneficiaries ?? []).filter(b => b.name === 'مراد').map(b => b.id),
    ]

    expect(new Set(identitiesForMurad).size).toBe(1)
    expect(identitiesForMurad.every(id => id === murad.id)).toBe(true)
  })

  it('resolves a beneficiary reference inside the canonical Party store', () => {
    let state = freshState()
    state = createExpenseBeneficiary(state, { name: 'الأسرة', kind: 'group' })
    const beneficiaryId = (state.expenseBeneficiaries ?? [])[0].id

    expect(state.parties.some(p => p.id === beneficiaryId)).toBe(true)
  })
})

describe('INV-021 — custody metadata absent means the owner holds it (RULE-002/RULE-014)', () => {
  it('does not report self-held assets as being in third-party custody', () => {
    const state = createAssetWithOpening(freshState(), {
      name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID,
      quantity: 1_000, costBasisSar: 1_000, groupId: 'g-banks',
    })
    expect(holdingsInThirdPartyCustody(state, SELF_ID)).toHaveLength(0)
  })
})

describe('INV-022 — net worth includes qualifying claims (CALC-011)', () => {
  it('counts money owed to the owner as part of gross asset value', () => {
    let state = createAssetWithOpening(freshState(), {
      name: 'ريال', kind: 'cash', symbol: 'SAR', nativeUnit: 'SAR', ownerId: SELF_ID,
      quantity: 1_000, costBasisSar: 1_000, groupId: 'g-banks',
    })
    state = createParty(state, { name: 'أخي', type: 'person' })
    const brother = state.parties.find(p => p.name === 'أخي')!
    const claim: Claim = {
      id: 'claim-1', creditorOwnerId: SELF_ID, debtorPartyId: brother.id,
      symbol: 'SAR', nativeUnit: 'SAR', quantity: 500, unitValueSar: 1, status: 'open',
    }
    state = { ...state, claims: [claim] }

    expect(netWorthByOwner(state, SELF_ID)).toBe(1_500)
  })
})

describe('INV-023 — no target flow requires a legacy Account (DEC-021 / ADR-004)', () => {
  it('onboards an existing asset into a Group without any Account row', () => {
    expect(() => addExistingAsset(freshState(), {
      ownerId: SELF_ID, accountId: '', name: 'سيارتي', symbol: 'CAR', kind: 'vehicle',
      nativeUnit: 'سيارة', quantity: 1, costBasisSar: 80_000, marketPriceSar: 70_000,
      performanceRole: 'store_of_value',
    })).not.toThrow()
  })
})
