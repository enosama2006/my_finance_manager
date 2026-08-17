import { ChevronDown, ChevronLeft, FolderTree, MapPin, RefreshCcw, UserRoundCheck, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { useReportingCurrency } from '../application/reportingCurrency'
import { useToast } from '../components/ToastProvider'
import { assetTypeById } from '../domain/assetCatalog'
import { currencyByCode, formatReportingValue, holdingUnitValueSar, reportingCurrencyCatalog } from '../domain/currencies'
import { assetGroupOf, holdingValueSar, ownerHoldingValueSar, ownerQuantity, ownerWeightedAverageCostSar } from '../domain/finance'
import { holdingUnrealizedGainLossSar, ownerHoldingCostBasisSar } from '../domain/lifecycle'
import { fetchMarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'
import type { Account, AccountGroup, Holding } from '../domain/types'
import '../reporting-currency.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 4 })
type Lens = 'custom' | 'owner' | 'asset'

export function Assets() {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const [reportingCurrency, setReportingCurrency] = useReportingCurrency()
  const [lens, setLens] = useState<Lens>('custom')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const activeGroups = (state.accountGroups ?? []).filter(g => g.status === 'active')
  const activeAccounts = state.accounts.filter(a => a.status === 'active')
  const activeHoldings = state.holdings.filter(h => !h.archived && h.quantity > 0)
  const roots = useMemo(() => activeGroups.filter(g => !g.parentId || !activeGroups.some(p => p.id === g.parentId)), [activeGroups])
  const displayValue = (valueSar: number) => formatReportingValue(valueSar, reportingCurrency)

  const lensGroups = useMemo(() => {
    const map = new Map<string, Holding[]>()
    activeHoldings.forEach(h => {
      const keys = lens === 'owner'
        ? h.ownership.filter(s => s.quantity > 0).map(s => state.parties.find(p => p.id === s.ownerId)?.name ?? s.ownerId)
        : [groupName(assetGroupOf(h.kind))]
      keys.forEach(k => map.set(k, [...(map.get(k) ?? []), h]))
    })
    return [...map.entries()]
  }, [state, lens, activeHoldings])

  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">GROUP → ACCOUNT → HOLDING</span><h2>الأصول والحسابات</h2><p>الرصيد يبقى بعملته الأصلية داخل الحساب، بينما إجماليات الحسابات والمجموعات تُحوّل إلى عملة العرض الرئيسية. تغيير عملة العرض لا ينشئ حركة مالية.</p></div><div className="assets-view-controls"><label className="reporting-currency-control"><span>عملة العرض الرئيسية</span><select value={reportingCurrency} onChange={e => setReportingCurrency(e.target.value)}>{reportingCurrencyCatalog.map(currency => <option key={currency.code} value={currency.code}>{currency.code} — {currency.label}</option>)}</select></label><div className="segmented"><button className={lens === 'custom' ? 'active' : ''} onClick={() => setLens('custom')}>مجموعاتي</button><button className={lens === 'owner' ? 'active' : ''} onClick={() => setLens('owner')}>المالك</button><button className={lens === 'asset' ? 'active' : ''} onClick={() => setLens('asset')}>نوع الأصل</button></div></div></section>

    {lens === 'custom' ? <CustomTree/> : lensGroups.length === 0 ? <section className="tree-panel"><EmptyState/></section> : <section className="tree-panel">{lensGroups.map(([group, holdings]) => {
      const key = `lens-${group}`
      const isOpen = expanded.has(key)
      const value = holdings.reduce((sum, h) => lens === 'owner' ? sum + ownerHoldingValueSar(h, state.parties.find(p => p.name === group)?.id ?? '') : sum + holdingValueSar(h), 0)
      return <div className="tree-group" key={group}><button className="tree-header" onClick={() => toggle(key)}><div className="tree-title"><div className="tree-avatar"><UserRoundCheck size={19}/></div><div><strong>{group}</strong><span>{holdings.length} حيازات</span></div></div><div className="tree-summary"><strong>{displayValue(value)}</strong>{isOpen ? <ChevronDown/> : <ChevronLeft/>}</div></button>{isOpen && <div className="tree-children">{lens === 'owner' ? renderOwnerAssetTree(group, holdings) : holdings.map(h => <HoldingCard key={h.id} h={h}/>)}</div>}</div>
    })}</section>}
  </div>

  function CustomTree() {
    const ungrouped = activeAccounts.filter(a => !a.groupId || !activeGroups.some(g => g.id === a.groupId))
    if (activeAccounts.length === 0) return <section className="tree-panel"><div className="empty-preview"><WalletCards/><strong>لا توجد حسابات بعد</strong><span>أنشئ حسابًا مباشرة. تستطيع وضعه في مجموعة مثل «البنوك» أو تركه بلا مجموعة.</span></div></section>
    return <section className="tree-panel">
      {roots.map(group => <GroupBranch key={group.id} group={group}/>) }
      {ungrouped.length > 0 && <div className="tree-group"><button className="tree-header" onClick={() => toggle('ungrouped')}><div className="tree-title"><div className="tree-avatar"><FolderTree size={19}/></div><div><strong>بدون مجموعة</strong><span>{ungrouped.length} حساب</span></div></div><div className="tree-summary"><strong>{displayValue(accountsValue(ungrouped))}</strong>{expanded.has('ungrouped') ? <ChevronDown/> : <ChevronLeft/>}</div></button>{expanded.has('ungrouped') && <div className="tree-children place-accounts">{ungrouped.map(account => <AccountBranch key={account.id} account={account}/>)}</div>}</div>}
    </section>
  }

  function GroupBranch({ group }: { group: AccountGroup }) {
    const children = activeGroups.filter(g => g.parentId === group.id)
    const directAccounts = activeAccounts.filter(a => a.groupId === group.id)
    const descendantIds = groupDescendants(group.id)
    const accounts = activeAccounts.filter(a => a.groupId && descendantIds.has(a.groupId))
    const key = `group-${group.id}`
    const isOpen = expanded.has(key)
    return <div className="tree-group place-tree-group">
      <button className="tree-header" onClick={() => toggle(key)}><div className="tree-title"><div className="tree-avatar"><FolderTree size={19}/></div><div><strong>{group.name}</strong><span>{directAccounts.length} حساب مباشر • {children.length} مجموعات فرعية</span></div></div><div className="tree-summary"><strong>{displayValue(accountsValue(accounts))}</strong>{isOpen ? <ChevronDown/> : <ChevronLeft/>}</div></button>
      {isOpen && <div className="tree-children place-accounts">{directAccounts.map(account => <AccountBranch key={account.id} account={account}/>)}{children.map(child => <GroupBranch key={child.id} group={child}/>)}</div>}
    </div>
  }

  function AccountBranch({ account }: { account: Account }) {
    const holdings = activeHoldings.filter(h => h.accountId === account.id)
    const value = holdings.reduce((sum, h) => sum + holdingValueSar(h), 0)
    const key = `account-${account.id}`
    const isOpen = expanded.has(key)
    return <section className="account-branch"><button className="account-branch-head" onClick={() => toggle(key)}><div><WalletCards size={17}/><span><strong>{account.name}</strong><small>{accountKindName(account.kind)}{account.currency ? ` • ${account.currency}` : ''}</small></span></div><span className="account-head-value"><strong>{displayValue(value)}</strong>{isOpen ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>}</span></button>{isOpen && (holdings.length ? <div className="account-holdings">{holdings.map(h => <HoldingCard key={h.id} h={h}/>)}</div> : <div className="place-empty-accounts">الحساب موجود ورصيده صفر.</div>)}</section>
  }

  function groupDescendants(rootId: string): Set<string> {
    const result = new Set<string>([rootId])
    const walk = (id: string) => activeGroups.filter(g => g.parentId === id).forEach(g => { if (!result.has(g.id)) { result.add(g.id); walk(g.id) } })
    walk(rootId); return result
  }
  function accountsValue(accounts: Account[]) { return activeHoldings.filter(h => accounts.some(a => a.id === h.accountId)).reduce((sum, h) => sum + holdingValueSar(h), 0) }

  function renderOwnerAssetTree(ownerName: string, holdings: Holding[]) {
    const byGroup = new Map<string, Holding[]>()
    holdings.forEach(h => { const key = groupName(assetGroupOf(h.kind)); byGroup.set(key, [...(byGroup.get(key) ?? []), h]) })
    return [...byGroup.entries()].map(([assetGroup, groupHoldings]) => <div className="asset-subgroup" key={`${ownerName}-${assetGroup}`}><div className="asset-subgroup-title"><span>{assetGroup}</span><strong>{displayValue(ownerValue(ownerName, groupHoldings))}</strong></div>{groupHoldings.map(h => <HoldingCard key={h.id} h={h}/>)}</div>)
  }
  function ownerValue(ownerName: string, holdings: Holding[]) { const party = state.parties.find(p => p.name === ownerName); return holdings.reduce((sum, h) => sum + (party ? ownerHoldingValueSar(h, party.id) : 0), 0) }

  async function refreshQuote(h: Holding) {
    const def = assetTypeById(h.assetTypeId)
    if (!def || !['crypto', 'metal', 'security'].includes(def.quoteStrategy)) return
    setRefreshingId(h.id)
    try {
      const quote = await fetchMarketQuote({ assetTypeId: def.id, symbol: h.symbol, quoteStrategy: def.quoteStrategy })
      if (!quote) { toast.info('لم يتوفر سعر من مزود السوق لهذا الأصل الآن. بقي آخر تقييم محفوظ.'); return }
      finance.updateHoldingQuote(h.id, quote); toast.success(`تم تحديث سعر «${h.name}» من ${quote.source}.`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث السعر') }
    finally { setRefreshingId(null) }
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
    const unitValueSar = holdingUnitValueSar(h)
    const currency = h.kind === 'cash' ? currencyByCode(h.symbol) : undefined
    return <div className="holding-card"><div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{account?.name ?? 'حساب غير معروف'} • {kindName(h.kind)}</span></div></div><div className="holding-qty"><strong>{h.quantity.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>≈ {displayValue(holdingValueSar(h))}</span></div><div className="holding-meta"><span><UserRoundCheck size={15}/> {ownerText || '—'}</span>{h.location && <span><MapPin size={15}/> {h.location}</span>}{h.kind === 'cash' && h.symbol !== 'SAR' && <span>سعر الصرف المستخدم: 1 {h.symbol} = {money.format(unitValueSar)} ر.س{currency?.referenceSar != null ? ' • مرجع تلقائي' : ''}</span>}{avgCost != null && <span>متوسط التكلفة: {displayValue(avgCost)} / {h.nativeUnit}</span>}{costBasis != null && <span>Cost Basis الحالي: {displayValue(costBasis)}</span>}{unrealized != null && <span className={unrealized >= 0 ? 'profit' : 'loss'}>غير محقق: {unrealized >= 0 ? '+' : ''}{displayValue(unrealized)} {returnPct != null ? `(${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)` : ''}</span>}<span>التقييم الحالي: {displayValue(unitValueSar)} / {h.nativeUnit} • {valuationName(h.valuationMethod)}</span><span>المصدر: {h.kind === 'cash' && currency?.referenceSar != null ? 'مرجع العملة' : h.valuationSource || 'غير محدد'}{h.valuedAt ? ` • ${new Date(h.valuedAt).toLocaleString('ar-SA')}` : ''}</span>{h.kind !== 'cash' && <span>النتيجة غير محققة حتى البيع أو التسييل الحقيقي.</span>}</div>{canRefresh && <button className="ghost holding-refresh" onClick={() => refreshQuote(h)} disabled={refreshingId === h.id}><RefreshCcw size={14}/> {refreshingId === h.id ? 'جاري التحديث…' : 'تحديث السعر'}</button>}</div>
  }
}

function EmptyState() { return <div className="empty-preview"><WalletCards/><strong>لا توجد أصول أو أرصدة بعد</strong><span>أنشئ حسابًا، ثم أضف رصيدًا أو أصلًا قائمًا أو نفّذ شراء.</span></div> }
function groupName(group: string) { return ({ cash_and_equivalents: 'النقد وما في حكمه', investments: 'الاستثمارات', real_estate: 'العقارات', other: 'أصول أخرى' } as Record<string, string>)[group] ?? group }
function kindName(kind: string) { return ({ cash: 'نقد وعملات', metal: 'ذهب وفضة ومعادن', collectible: 'مقتنيات', fund: 'صناديق', stock: 'أسهم', crypto: 'عملات رقمية', real_estate: 'عقارات', vehicle: 'مركبات', fixed_term: 'استثمارات لأجل', receivable: 'ذمم ومطالبات', other: 'أخرى' } as Record<string, string>)[kind] ?? kind }
function valuationName(method: string) { return ({ nominal: 'اسمي', fx: 'صرف عملة', market_quote: 'سوقي', manual_appraisal: 'تقييم يدوي', contractual: 'تعاقدي', cost_fallback: 'مؤقت من تكلفة الاقتناء', unvalued: 'غير مقيم' } as Record<string, string>)[method] ?? method }
function accountKindName(kind: string) { return ({ checking: 'جاري', saving: 'ادخار', investment: 'استثمار', cash_container: 'خزنة/حاوية', prepaid: 'مسبق الدفع', custody: 'حفظ أصول', fixed_term: 'لأجل', credit_card: 'بطاقة ائتمان' } as Record<string, string>)[kind] ?? kind }
