import { ChevronDown, ChevronLeft, Landmark, MapPin, UserRoundCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { holdingValueSar, ownerHoldingValueSar, ownerQuantity } from '../domain/finance'
import { SELF_ID } from '../data/seed'
import type { Holding } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })
type Lens = 'owner' | 'account' | 'kind'

export function Assets() {
  const { state } = useFinance()
  const [lens, setLens] = useState<Lens>('owner')
  const [expanded, setExpanded] = useState<string | null>('أنا')

  const groups = useMemo(() => {
    const map = new Map<string, Holding[]>()
    state.holdings.filter(h => !h.archived).forEach(h => {
      const keys = lens === 'owner'
        ? h.ownership.map(s => state.parties.find(p => p.id === s.ownerId)?.name ?? s.ownerId)
        : [lens === 'account' ? state.accounts.find(a => a.id === h.accountId)?.name ?? 'حساب غير معروف' : kindName(h.kind)]
      keys.forEach(k => map.set(k, [...(map.get(k) ?? []), h]))
    })
    return [...map.entries()]
  }, [state, lens])

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">ONE REALITY / MULTIPLE MAPS</span><h2>الأصول والحسابات</h2><p>ابدأ بالمالك، ثم انزل إلى نوع الأصل والحساب/مكان الحفظ. الحساب يجيب «أين؟»، الأصل «ماذا؟»، والمالك «لمن؟».</p></div><div className="segmented"><button className={lens === 'owner' ? 'active' : ''} onClick={() => setLens('owner')}>المالك</button><button className={lens === 'kind' ? 'active' : ''} onClick={() => setLens('kind')}>الأصل</button><button className={lens === 'account' ? 'active' : ''} onClick={() => setLens('account')}>الحساب</button></div></section>
    <section className="tree-panel">{groups.map(([group, holdings]) => { const isOpen = expanded === group; const value = holdings.reduce((sum, h) => { if (lens === 'owner') { const party = state.parties.find(p => p.name === group); return sum + (party ? ownerHoldingValueSar(h, party.id) : 0) } return sum + holdingValueSar(h) }, 0); return <div className="tree-group" key={group}><button className="tree-header" onClick={() => setExpanded(isOpen ? null : group)}><div className="tree-title"><div className="tree-avatar">{lens === 'account' ? <Landmark size={19} /> : <UserRoundCheck size={19} />}</div><div><strong>{group}</strong><span>{holdings.length} حيازات</span></div></div><div className="tree-summary"><strong>{money.format(value)} ر.س</strong>{isOpen ? <ChevronDown /> : <ChevronLeft />}</div></button>{isOpen && <div className="tree-children">{lens === 'owner' ? renderOwnerCategories(group, holdings) : holdings.map(h => <HoldingCard key={`${group}-${h.id}`} h={h} />)}</div>}</div> })}</section>
  </div>

  function renderOwnerCategories(ownerName: string, holdings: Holding[]) {
    const byKind = new Map<string, Holding[]>()
    holdings.forEach(h => { const key = kindName(h.kind); byKind.set(key, [...(byKind.get(key) ?? []), h]) })
    return [...byKind.entries()].map(([kind, list]) => <div className="asset-subgroup" key={`${ownerName}-${kind}`}><div className="asset-subgroup-title"><span>{kind}</span><strong>{money.format(list.reduce((sum, h) => { const party = state.parties.find(p => p.name === ownerName); return sum + (party ? ownerHoldingValueSar(h, party.id) : 0) }, 0))} ر.س</strong></div>{list.map(h => <HoldingCard key={`${ownerName}-${h.id}`} h={h} />)}</div>)
  }

  function HoldingCard({ h }: { h: Holding }) {
    const custodian = state.parties.find(p => p.id === h.custodianId)?.name ?? h.custodianId
    const account = state.accounts.find(a => a.id === h.accountId)
    const ownerText = h.ownership.map(s => `${state.parties.find(p => p.id === s.ownerId)?.name}: ${s.quantity.toLocaleString('ar-SA')} ${h.nativeUnit}`).join(' • ')
    const ownQty = ownerQuantity(h, SELF_ID)
    return <div className="holding-card"><div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{account?.name ?? 'حساب غير معروف'}</span></div></div><div className="holding-qty"><strong>{h.quantity.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>{money.format(holdingValueSar(h))} ر.س</span></div><div className="holding-meta"><span><UserRoundCheck size={15} /> الملكية: {ownerText}</span><span><Landmark size={15} /> الحافظ: {custodian}</span>{h.location && <span><MapPin size={15} /> {h.location}</span>}<span>التقييم: {valuationName(h.valuationMethod)}{h.valuedAt ? ` • ${new Date(h.valuedAt).toLocaleDateString('ar-SA')}` : ''}</span></div>{ownQty > 0 && h.custodianId !== SELF_ID && <div className="custody-badge">هذا أصل لك، لكنه محفوظ لدى طرف آخر ولا يدخل ضمن ملكية الحافظ.</div>}</div>
  }
}

function kindName(kind: string) { return ({ cash: 'نقد', currency: 'نقد وعملات', metal: 'معادن', collectible: 'مقتنيات', fund: 'صناديق', stock: 'أسهم', crypto: 'عملات رقمية', real_estate: 'عقارات', fixed_term: 'استثمارات لأجل', receivable: 'ذمم ومطالبات', other: 'أخرى' } as Record<string, string>)[kind] ?? kind }
function valuationName(method: string) { return ({ nominal: 'اسمي', fx: 'صرف عملة', market_quote: 'سوقي', manual_appraisal: 'تقييم يدوي', contractual: 'تعاقدي', cost_fallback: 'تكلفة مؤقتة', unvalued: 'غير مقيم' } as Record<string, string>)[method] ?? method }
