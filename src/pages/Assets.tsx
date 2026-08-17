import { ChevronDown, ChevronLeft, Landmark, MapPin, RefreshCcw, UserRoundCheck, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import { assetTypeById } from '../domain/assetCatalog'
import { assetGroupOf, holdingValueSar, ownerHoldingValueSar, ownerQuantity, ownerWeightedAverageCostSar } from '../domain/finance'
import { holdingUnrealizedGainLossSar, ownerHoldingCostBasisSar } from '../domain/lifecycle'
import { fetchMarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'
import type { Holding } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
type Lens = 'place' | 'owner' | 'group'

export function Assets() {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const [lens, setLens] = useState<Lens>('place')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const ownerGroups = useMemo(() => {
    const map = new Map<string, Holding[]>()
    state.holdings.filter(h => !h.archived && h.quantity > 0).forEach(h => {
      const keys = lens === 'owner'
        ? h.ownership.filter(s => s.quantity > 0).map(s => state.parties.find(p => p.id === s.ownerId)?.name ?? s.ownerId)
        : [groupName(assetGroupOf(h.kind))]
      keys.forEach(k => map.set(k, [...(map.get(k) ?? []), h]))
    })
    return [...map.entries()]
  }, [state, lens])

  const places = useMemo(() => state.parties
    .filter(p => p.type !== 'self' && state.accounts.some(a => a.status === 'active' && a.custodianId === p.id)), [state])

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">PLACE → ACCOUNT → ASSET</span><h2>الأصول والحسابات</h2><p>ابدأ بالمكان: مصرف، منزل، منصة أو حافظ. تحته الحسابات/الحاويات، ثم الأصول الموجودة فعليًا. المكان والحساب لا يُحسبان كأصلين إضافيين.</p></div><div className="segmented"><button className={lens === 'place' ? 'active' : ''} onClick={() => setLens('place')}>المكان</button><button className={lens === 'owner' ? 'active' : ''} onClick={() => setLens('owner')}>المالك</button><button className={lens === 'group' ? 'active' : ''} onClick={() => setLens('group')}>نوع الأصل</button></div></section>

    {lens === 'place' ? <PlaceTree /> : ownerGroups.length === 0 ? <section className="tree-panel"><EmptyState /></section> : <section className="tree-panel">{ownerGroups.map(([group, holdings]) => {
      const isOpen = expanded === group
      const value = holdings.reduce((sum, h) => lens === 'owner' ? sum + ownerHoldingValueSar(h, state.parties.find(p => p.name === group)?.id ?? '') : sum + holdingValueSar(h), 0)
      return <div className="tree-group" key={group}><button className="tree-header" onClick={() => setExpanded(isOpen ? null : group)}><div className="tree-title"><div className="tree-avatar"><UserRoundCheck size={19} /></div><div><strong>{group}</strong><span>{holdings.length} حيازات</span></div></div><div className="tree-summary"><strong>{money.format(value)} ر.س</strong>{isOpen ? <ChevronDown /> : <ChevronLeft />}</div></button>{isOpen && <div className="tree-children">{lens === 'owner' ? renderOwnerAssetTree(group, holdings) : holdings.map(h => <HoldingCard key={h.id} h={h} />)}</div>}</div>
    })}</section>}
  </div>

  function PlaceTree() {
    if (places.length === 0) return <section className="tree-panel"><div className="empty-preview"><Landmark /><strong>لا توجد أماكن وحسابات بعد</strong><span>أضف «مصرف الراجحي» أو «المنزل»، ثم أنشئ حسابًا تحته. سيظهر هنا حتى لو كان رصيده صفرًا.</span></div></section>
    return <section className="tree-panel">{places.map(place => {
      const accounts = state.accounts.filter(a => a.status === 'active' && a.custodianId === place.id)
      const holdings = state.holdings.filter(h => !h.archived && h.quantity > 0 && accounts.some(a => a.id === h.accountId))
      const value = holdings.reduce((sum, h) => sum + holdingValueSar(h), 0)
      const isOpen = expanded === place.id
      return <div className="tree-group place-tree-group" key={place.id}>
        <button className="tree-header" onClick={() => setExpanded(isOpen ? null : place.id)}><div className="tree-title"><div className="tree-avatar"><Landmark size={19} /></div><div><strong>{place.name}</strong><span>{accounts.length} حساب/حاوية • {holdings.length} أصول/أرصدة</span></div></div><div className="tree-summary"><strong>{money.format(value)} ر.س</strong>{isOpen ? <ChevronDown /> : <ChevronLeft />}</div></button>
        {isOpen && <div className="tree-children place-accounts">{accounts.map(account => {
          const accountHoldings = holdings.filter(h => h.accountId === account.id)
          const accountValue = accountHoldings.reduce((sum, h) => sum + holdingValueSar(h), 0)
          return <section className="account-branch" key={account.id}><div className="account-branch-head"><div><WalletCards size={17} /><span><strong>{account.name}</strong><small>{accountKindName(account.kind)}{account.currency ? ` • ${account.currency}` : ''}</small></span></div><strong>{money.format(accountValue)} ر.س</strong></div>{accountHoldings.length ? <div className="account-holdings">{accountHoldings.map(h => <HoldingCard key={h.id} h={h} />)}</div> : <div className="place-empty-accounts">الحساب موجود ورصيده صفر.</div>}</section>
        })}</div>}
      </div>
    })}</section>
  }

  function renderOwnerAssetTree(ownerName: string, holdings: Holding[]) {
    const byGroup = new Map<string, Holding[]>()
    holdings.forEach(h => { const key = groupName(assetGroupOf(h.kind)); byGroup.set(key, [...(byGroup.get(key) ?? []), h]) })
    return [...byGroup.entries()].map(([assetGroup, groupHoldings]) => <div className="asset-subgroup" key={`${ownerName}-${assetGroup}`}><div className="asset-subgroup-title"><span>{assetGroup}</span><strong>{money.format(ownerValue(ownerName, groupHoldings))} ر.س</strong></div>{groupHoldings.map(h => <HoldingCard key={h.id} h={h} />)}</div>)
  }

  function ownerValue(ownerName: string, holdings: Holding[]) {
    const party = state.parties.find(p => p.name === ownerName)
    return holdings.reduce((sum, h) => sum + (party ? ownerHoldingValueSar(h, party.id) : 0), 0)
  }

  async function refreshQuote(h: Holding) {
    const def = assetTypeById(h.assetTypeId)
    if (!def || !['crypto', 'metal', 'security'].includes(def.quoteStrategy)) return
    setRefreshingId(h.id)
    try {
      const quote = await fetchMarketQuote({ assetTypeId: def.id, symbol: h.symbol, quoteStrategy: def.quoteStrategy })
      if (!quote) { toast.info('لم يتوفر سعر من مزود السوق لهذا الأصل الآن. بقي آخر تقييم محفوظ.'); return }
      finance.updateHoldingQuote(h.id, quote)
      toast.success(`تم تحديث سعر «${h.name}» من ${quote.source}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث السعر')
    } finally { setRefreshingId(null) }
  }

  function HoldingCard({ h }: { h: Holding }) {
    const account = state.accounts.find(a => a.id === h.accountId)
    const ownerText = h.ownership.filter(s => s.quantity > 0).map(s => `${state.parties.find(p => p.id === s.ownerId)?.name}: ${s.quantity.toLocaleString('ar-SA')} ${h.nativeUnit}`).join(' • ')
    const ownQty = ownerQuantity(h, SELF_ID)
    const avgCost = ownQty > 0 ? ownerWeightedAverageCostSar(h, SELF_ID) : null
    const costBasis = ownQty > 0 ? ownerHoldingCostBasisSar(h, SELF_ID) : null
    const unrealized = ownQty > 0 && h.kind !== 'cash' ? holdingUnrealizedGainLossSar(h, SELF_ID) : null
    const returnPct = unrealized != null && costBasis != null && costBasis > 0 ? unrealized / costBasis * 100 : null
    const def = assetTypeById(h.assetTypeId)
    const canRefresh = !!def && ['crypto', 'metal', 'security'].includes(def.quoteStrategy)
    return <div className="holding-card"><div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{account?.name ?? 'حساب غير معروف'} • {kindName(h.kind)}</span></div></div><div className="holding-qty"><strong>{h.quantity.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>{money.format(holdingValueSar(h))} ر.س</span></div><div className="holding-meta"><span><UserRoundCheck size={15} /> {ownerText || '—'}</span>{h.location && <span><MapPin size={15} /> {h.location}</span>}{avgCost != null && <span>متوسط التكلفة: {money.format(avgCost)} ر.س / {h.nativeUnit}</span>}{costBasis != null && <span>Cost Basis الحالي: {money.format(costBasis)} ر.س</span>}{unrealized != null && <span className={unrealized >= 0 ? 'profit' : 'loss'}>غير محقق: {unrealized >= 0 ? '+' : ''}{money.format(unrealized)} ر.س {returnPct != null ? `(${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)` : ''}</span>}<span>التقييم الحالي: {money.format(h.marketPriceSar)} ر.س / {h.nativeUnit} • {valuationName(h.valuationMethod)}</span><span>المصدر: {h.valuationSource || 'غير محدد'}{h.valuedAt ? ` • ${new Date(h.valuedAt).toLocaleString('ar-SA')}` : ''}</span>{h.kind !== 'cash' && <span>النتيجة أعلاه غير محققة؛ لا تُثبت كربح/خسارة محققة إلا عند البيع أو التسييل الحقيقي.</span>}</div>{canRefresh && <button className="ghost holding-refresh" onClick={() => refreshQuote(h)} disabled={refreshingId === h.id}><RefreshCcw size={14} /> {refreshingId === h.id ? 'جاري التحديث…' : 'تحديث السعر'}</button>}</div>
  }
}

function EmptyState() { return <div className="empty-preview"><WalletCards /><strong>لا توجد أصول أو أرصدة بعد</strong><span>ابدأ بإنشاء مكان وحساب، ثم أضف رصيدًا أو أصلًا قائمًا أو نفّذ شراء.</span></div> }
function groupName(group: string) { return ({ cash_and_equivalents: 'النقد وما في حكمه', investments: 'الاستثمارات', real_estate: 'العقارات', other: 'أصول أخرى' } as Record<string, string>)[group] ?? group }
function kindName(kind: string) { return ({ cash: 'نقد وعملات', metal: 'ذهب وفضة ومعادن', collectible: 'مقتنيات', fund: 'صناديق', stock: 'أسهم', crypto: 'عملات رقمية', real_estate: 'عقارات', vehicle: 'مركبات', fixed_term: 'استثمارات لأجل', receivable: 'ذمم ومطالبات', other: 'أخرى' } as Record<string, string>)[kind] ?? kind }
function valuationName(method: string) { return ({ nominal: 'اسمي', fx: 'صرف عملة', market_quote: 'سوقي', manual_appraisal: 'تقييم يدوي', contractual: 'تعاقدي', cost_fallback: 'مؤقت من تكلفة الاقتناء', unvalued: 'غير مقيم' } as Record<string, string>)[method] ?? method }
function accountKindName(kind: string) { return ({ checking: 'جاري', saving: 'ادخار', investment: 'استثمار', cash_container: 'خزنة/حاوية', prepaid: 'مسبق الدفع', custody: 'حفظ أصول', fixed_term: 'لأجل', credit_card: 'بطاقة ائتمان' } as Record<string, string>)[kind] ?? kind }
