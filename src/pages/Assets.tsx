import { ChevronDown, ChevronLeft, Landmark, MapPin, UserRoundCheck, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { assetGroupOf, holdingValueSar, ownerHoldingValueSar, ownerQuantity, ownerWeightedAverageCostSar } from '../domain/finance'
import { holdingUnrealizedGainLossSar } from '../domain/lifecycle'
import { SELF_ID } from '../data/seed'
import type { Holding } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
type Lens = 'owner' | 'account' | 'group'

export function Assets() {
  const { state } = useFinance()
  const [lens, setLens] = useState<Lens>('owner')
  const [expanded, setExpanded] = useState<string | null>('أنا')

  const groups = useMemo(() => {
    const map = new Map<string, Holding[]>()
    if (lens === 'account') state.accounts.filter(a => a.status === 'active').forEach(account => map.set(account.name, []))
    state.holdings.filter(h => !h.archived && h.quantity > 0).forEach(h => {
      const keys = lens === 'owner'
        ? h.ownership.filter(s => s.quantity > 0).map(s => state.parties.find(p => p.id === s.ownerId)?.name ?? s.ownerId)
        : [lens === 'account' ? state.accounts.find(a => a.id === h.accountId)?.name ?? 'حساب غير معروف' : groupName(assetGroupOf(h.kind))]
      keys.forEach(k => map.set(k, [...(map.get(k) ?? []), h]))
    })
    return [...map.entries()]
  }, [state, lens])

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">ASSET ≠ ACCOUNT / COST ≠ VALUE</span><h2>الأصول والحسابات</h2><p>الحساب يجيب «أين؟»، والأصل «ماذا وكم؟». يمكن أن يوجد حساب برصيد صفر؛ القيمة المالية تأتي فقط من الـHoldings داخله.</p></div><div className="segmented"><button className={lens === 'owner' ? 'active' : ''} onClick={() => setLens('owner')}>المالك</button><button className={lens === 'group' ? 'active' : ''} onClick={() => setLens('group')}>التصنيف</button><button className={lens === 'account' ? 'active' : ''} onClick={() => setLens('account')}>الحساب</button></div></section>
    {groups.length === 0 ? <section className="tree-panel"><div className="empty-preview"><WalletCards /><strong>{lens === 'account' ? 'لا توجد حسابات بعد' : 'لا توجد أصول أو أرصدة بعد'}</strong><span>{lens === 'account' ? 'أضف بنكًا/جهة ثم أنشئ حسابك الأول من العمليات المالية.' : 'بعد إنشاء الحساب أضف رصيدًا افتتاحيًا أو أصلًا قائمًا أو نفّذ شراء أصل.'}</span></div></section> : <section className="tree-panel">{groups.map(([group, holdings]) => { const isOpen = expanded === group; const value = holdings.reduce((sum, h) => { if (lens === 'owner') { const party = state.parties.find(p => p.name === group); return sum + (party ? ownerHoldingValueSar(h, party.id) : 0) } return sum + holdingValueSar(h) }, 0); return <div className="tree-group" key={group}><button className="tree-header" onClick={() => setExpanded(isOpen ? null : group)}><div className="tree-title"><div className="tree-avatar">{lens === 'account' ? <Landmark size={19} /> : <UserRoundCheck size={19} />}</div><div><strong>{group}</strong><span>{holdings.length ? `${holdings.length} حيازات` : 'حساب بلا رصيد'}</span></div></div><div className="tree-summary"><strong>{money.format(value)} ر.س</strong>{isOpen ? <ChevronDown /> : <ChevronLeft />}</div></button>{isOpen && <div className="tree-children">{holdings.length === 0 ? <div className="empty-preview"><Landmark /><strong>الرصيد صفر</strong><span>الحساب موجود كحاوية فقط. أضف له رصيدًا عندما تريد.</span></div> : lens === 'owner' ? renderOwnerAssetTree(group, holdings) : holdings.map(h => <HoldingCard key={`${group}-${h.id}`} h={h} />)}</div>}</div> })}</section>}
  </div>

  function renderOwnerAssetTree(ownerName: string, holdings: Holding[]) {
    const byGroup = new Map<string, Holding[]>()
    holdings.forEach(h => { const key = groupName(assetGroupOf(h.kind)); byGroup.set(key, [...(byGroup.get(key) ?? []), h]) })
    return [...byGroup.entries()].map(([assetGroup, groupHoldings]) => {
      const byKind = new Map<string, Holding[]>()
      groupHoldings.forEach(h => { const key = kindName(h.kind); byKind.set(key, [...(byKind.get(key) ?? []), h]) })
      return <div className="asset-subgroup" key={`${ownerName}-${assetGroup}`}>
        <div className="asset-subgroup-title"><span>{assetGroup}</span><strong>{money.format(ownerValue(ownerName, groupHoldings))} ر.س</strong></div>
        {[...byKind.entries()].map(([kind, list]) => <div className="asset-subgroup" key={`${ownerName}-${assetGroup}-${kind}`}><div className="asset-subgroup-title"><span>{kind}</span><strong>{money.format(ownerValue(ownerName, list))} ر.س</strong></div>{list.map(h => <HoldingCard key={`${ownerName}-${h.id}`} h={h} />)}</div>)}
      </div>
    })
  }

  function ownerValue(ownerName: string, holdings: Holding[]) {
    const party = state.parties.find(p => p.name === ownerName)
    return holdings.reduce((sum, h) => sum + (party ? ownerHoldingValueSar(h, party.id) : 0), 0)
  }

  function HoldingCard({ h }: { h: Holding }) {
    const custodian = state.parties.find(p => p.id === h.custodianId)?.name ?? h.custodianId
    const account = state.accounts.find(a => a.id === h.accountId)
    const ownerText = h.ownership.filter(s => s.quantity > 0).map(s => `${state.parties.find(p => p.id === s.ownerId)?.name}: ${s.quantity.toLocaleString('ar-SA')} ${h.nativeUnit}`).join(' • ')
    const ownQty = ownerQuantity(h, SELF_ID)
    const avgCost = ownQty > 0 ? ownerWeightedAverageCostSar(h, SELF_ID) : null
    const unrealized = ownQty > 0 ? holdingUnrealizedGainLossSar(h, SELF_ID) : null
    const showUnrealized = h.performanceRole !== 'transactional_cash' && h.performanceRole !== 'bridge' && unrealized != null
    return <div className="holding-card"><div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{account?.name ?? 'حساب غير معروف'}</span></div></div><div className="holding-qty"><strong>{h.quantity.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>{money.format(holdingValueSar(h))} ر.س</span></div><div className="holding-meta"><span>الأصل: {kindName(h.kind)}{h.kind === 'cash' ? ` • العملة ${h.symbol}` : ''}</span><span><UserRoundCheck size={15} /> الملكية: {ownerText || '—'}</span><span><Landmark size={15} /> الحافظ: {custodian}</span>{h.location && <span><MapPin size={15} /> {h.location}</span>}<span>التقييم: {valuationName(h.valuationMethod)}{h.valuedAt ? ` • ${new Date(h.valuedAt).toLocaleDateString('ar-SA')}` : ''}</span>{avgCost != null && <span>متوسط التكلفة: {money.format(avgCost)} ر.س / {h.nativeUnit}</span>}{showUnrealized && <span>غير محقق: {unrealized! >= 0 ? '+' : ''}{money.format(unrealized!)} ر.س</span>}{h.performanceRole === 'transactional_cash' && <span>السياسة: سيولة تشغيلية — نحتفظ بالتكلفة ولا نعرض P/L غير محقق</span>}{h.acquisitionJourney?.length ? <span>مسار الاقتناء: {h.acquisitionJourney.join(' ← ')}</span> : null}</div>{ownQty > 0 && h.custodianId !== SELF_ID && <div className="custody-badge">هذا أصل لك، لكنه محفوظ لدى طرف آخر ولا يدخل ضمن ملكية الحافظ.</div>}</div>
  }
}

function groupName(group: string) { return ({ cash_and_equivalents: 'النقد وما في حكمه', investments: 'الاستثمارات', real_estate: 'العقارات', other: 'أصول أخرى' } as Record<string, string>)[group] ?? group }
function kindName(kind: string) { return ({ cash: 'نقد وعملات', metal: 'ذهب وفضة ومعادن', collectible: 'مقتنيات', fund: 'صناديق', stock: 'أسهم', crypto: 'عملات رقمية', real_estate: 'عقارات', vehicle: 'مركبات', fixed_term: 'استثمارات لأجل', receivable: 'ذمم ومطالبات', other: 'أخرى' } as Record<string, string>)[kind] ?? kind }
function valuationName(method: string) { return ({ nominal: 'اسمي', fx: 'صرف عملة', market_quote: 'سوقي', manual_appraisal: 'تقييم يدوي', contractual: 'تعاقدي', cost_fallback: 'تكلفة مؤقتة', unvalued: 'غير مقيم' } as Record<string, string>)[method] ?? method }
