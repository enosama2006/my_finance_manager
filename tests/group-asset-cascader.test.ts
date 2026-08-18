import { describe, expect, it } from 'vitest'
import { buildGroupAssetLevels } from '../src/components/GroupAssetCascader'
import type { AccountGroup, Holding } from '../src/domain/types'

const groups: AccountGroup[] = [
  { id: 'g-bank', name: 'البنوك', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g-rajhi', name: 'الراجحي', parentId: 'g-bank', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g-invest', name: 'الاستثمارات', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
]
function asset(id: string, name: string, groupId?: string): Holding {
  return { id, name, groupId, symbol: 'SAR', kind: 'cash', nativeUnit: 'SAR', quantity: 100, marketPriceSar: 1, costLots: [], valuationMethod: 'nominal', ownership: [] }
}

const assets = [asset('a-root', 'نقد حر'), asset('a-rajhi', 'جاري الراجحي', 'g-rajhi'), asset('a-invest', 'سيولة استثمارية', 'g-invest')]

describe('GroupAssetCascader tree levels', () => {
  it('shows root groups and ungrouped assets at the root only', () => {
    const levels = buildGroupAssetLevels(groups, assets, [])
    expect(levels).toHaveLength(1)
    expect(levels[0].groups.map(g => g.id)).toEqual(['g-bank', 'g-invest'])
    expect(levels[0].assets.map(a => a.id)).toEqual(['a-root'])
  })

  it('navigates branch by branch and exposes only direct leaf assets at each level', () => {
    const levels = buildGroupAssetLevels(groups, assets, ['g-bank', 'g-rajhi'])
    expect(levels).toHaveLength(3)
    expect(levels[1].groups.map(g => g.id)).toEqual(['g-rajhi'])
    expect(levels[1].assets).toHaveLength(0)
    expect(levels[2].groups).toHaveLength(0)
    expect(levels[2].assets.map(a => a.id)).toEqual(['a-rajhi'])
  })
})
