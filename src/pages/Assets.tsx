import { ChevronDown, ChevronLeft, MapPin, UserRoundCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { ownerHoldingValueSar, ownerQuantity } from '../domain/finance'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })
type Lens = 'owner' | 'custody' | 'kind'

export function Assets() {
  const { state } = useFinance()
  const [lens, setLens] = useState<Lens>('owner')
  const [expanded, setExpanded] = useState<string | null>('أنا')

  const groups = useMemo(() => {
    const map = new Map<string, typeof state.holdings>()
    state.holdings.forEach(h => {
      const keys = lens === 'owner'
        ? h.ownership.map(s => state.parties.find(p => p.id === s.ownerId)?.name ?? s.ownerId)
        : [lens === 'custody' ? state.parties.find(p => p.id === h.custodianId)?.name ?? 'غير معروف' : kindName(h.kind)]
      keys.forEach(k => map.set(k, [...(map.get(k) ?? []), h]))
    })
    return [...map.entries()]
  }, [state, lens])

  return <div className="page-stack">
    <section className="section-intro">
      <div><span className="eyebrow">MULTI-LENS ASSET VIEW</span><h2>نفس الأصل، أكثر من زاوية</h2><p>لا نكرر الأصل. نغير فقط طريقة النظر إليه: من يملكه؟ من يحوزه؟ وما نوعه؟</p></div>
      <div className="segmented">
        <button className={lens === 'owner' ? 'active' : ''} onClick={() => setLens('owner')}>حسب المالك</button>
        <button className={lens === 'custody' ? 'active' : ''} onClick={() => setLens('custody')}>حسب الحائز</button>
        <button className={lens === 'kind' ? 'active' : ''} onClick={() => setLens('kind')}>حسب الأصل</button>
      </div>
    </section>

    <section className="tree-panel">
      {groups.map(([group, holdings]) => {
        const isOpen = expanded === group
        const value = holdings.reduce((sum, h) => {
          if (lens === 'owner') {
            const party = state.parties.find(p => p.name === group)
            return sum + (party ? ownerHoldingValueSar(h, party.id) : 0)
          }
          return sum + h.quantity * h.marketPriceSar
        }, 0)
        return <div className="tree-group" key={group}>
          <button className="tree-header" onClick={() => setExpanded(isOpen ? null : group)}>
            <div className="tree-title"><div className="tree-avatar"><UserRoundCheck size={19} /></div><div><strong>{group}</strong><span>{holdings.length} حيازات</span></div></div>
            <div className="tree-summary"><strong>{money.format(value)} ر.س</strong>{isOpen ? <ChevronDown /> : <ChevronLeft />}</div>
          </button>
          {isOpen && <div className="tree-children">
            {holdings.map(h => {
              const custodian = state.parties.find(p => p.id === h.custodianId)?.name ?? h.custodianId
              const ownerText = h.ownership.map(s => `${state.parties.find(p => p.id === s.ownerId)?.name}: ${s.quantity.toLocaleString('ar-SA')} ${h.nativeUnit}`).join(' • ')
              const ownQty = ownerQuantity(h, SELF_ID)
              return <div className="holding-card" key={`${group}-${h.id}`}>
                <div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{h.container}</span></div></div>
                <div className="holding-qty"><strong>{h.quantity.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>{money.format(h.quantity * h.marketPriceSar)} ر.س</span></div>
                <div className="holding-meta"><span><UserRoundCheck size={15} /> الملكية: {ownerText}</span><span><MapPin size={15} /> الحيازة: {custodian} • {h.location}</span></div>
                {ownQty > 0 && h.custodianId !== SELF_ID && <div className="custody-badge">هذا أصل لك، لكنه محفوظ لدى طرف آخر</div>}
              </div>
            })}
          </div>}
        </div>
      })}
    </section>
  </div>
}

function kindName(kind: string) {
  return ({ cash: 'نقد', currency: 'عملات', metal: 'معادن', fund: 'صناديق', stock: 'أسهم', real_estate: 'عقارات', other: 'أخرى' } as Record<string, string>)[kind] ?? kind
}
