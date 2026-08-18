import { ArrowLeftRight, BanknoteArrowDown, Boxes, CirclePlus, FolderPlus, PackagePlus, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { AllocateToPortfolioInput, CreatePortfolioInput } from '../application/commands'
import type { CreateAssetInput } from '../application/assets'
import type { AddAssetIncomeInput, SetAssetOpeningBalanceInput, TransferBetweenAssetsInput } from '../application/assetTransactions'
import { previewSimplifiedPurchase, type SimplifiedPurchaseInput } from '../application/purchase'
import { GroupAssetCascader } from '../components/GroupAssetCascader'
import { GroupCascader } from '../components/GroupCascader'
import { useToast } from '../components/ToastProvider'
import { assetTypeById, assetTypeCatalog, type AssetTypeId } from '../domain/assetCatalog'
import { currencyCatalog, currencyReferenceRateSar } from '../domain/currencies'
import { availableQuantity, ownerQuantity, ownerWeightedAverageCostSar } from '../domain/finance'
import type { AccountKind, FinanceState, Holding, Party, Portfolio, PortfolioProfile } from '../domain/types'
import { fetchMarketQuote, type MarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const num = (value: string) => Number(value.replace(/,/g, ''))
const err = (error: unknown) => error instanceof Error ? error.message : 'تعذر تنفيذ العملية'

type ActionKey = 'purchase' | 'asset' | 'funds' | 'transfer' | 'portfolio' | 'allocate'
type NewAssetType = 'cash' | AssetTypeId
type PurchaseTargetMode = 'new' | 'existing'
type FxEntryMode = 'target_amount' | 'exchange_rate'
const actions: { id: ActionKey; title: string; sub: string; icon: typeof ShoppingCart }[] = [
  { id: 'purchase', title: 'شراء أصل', sub: 'أصل نقدي ← أصل جديد أو زيادة أصل موجود', icon: ShoppingCart },
  { id: 'asset', title: 'إضافة أصل موجود', sub: 'سجّل ما تملكه الآن بأقل حقول ممكنة', icon: PackagePlus },
  { id: 'funds', title: 'إضافة أموال', sub: 'افتتاحي واحد أو دخل متكرر', icon: BanknoteArrowDown },
  { id: 'transfer', title: 'نقل أموال', sub: 'بين حسابات نقدية ولو اختلفت العملة', icon: ArrowLeftRight },
  { id: 'portfolio', title: 'إنشاء محفظة', sub: 'الغرض الاقتصادي مستقل', icon: FolderPlus },
  { id: 'allocate', title: 'تخصيص لمحفظة', sub: 'الغرض فقط بلا نقل الأصل', icon: Boxes },
]

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'checking', label: 'جاري مصرفي' }, { value: 'saving', label: 'ادخار' }, { value: 'cash_container', label: 'نقد فعلي / خزنة' },
  { value: 'investment', label: 'رصيد استثماري' }, { value: 'prepaid', label: 'مسبق الدفع' }, { value: 'fixed_term', label: 'لأجل' },
]
const profiles: { value: PortfolioProfile; label: string }[] = [
  { value: 'investment', label: 'استثمار' }, { value: 'savings_goal', label: 'ادخار / هدف' }, { value: 'reserve', label: 'احتياطي' },
  { value: 'commitment', label: 'التزام' }, { value: 'spending_budget', label: 'ميزانية مصروف' }, { value: 'deal', label: 'عملية / صفقة' },
]

export function OperationsV2({ goTrade }: { goTrade: () => void }) {
  const finance = useFinance(); const toast = useToast(); const { state } = finance
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const groups = (state.accountGroups ?? []).filter(g => g.status === 'active')
  const assets = state.holdings.filter(h => !h.archived)
  const portfolios = state.portfolios.filter(p => p.status === 'active')
  const [action, setAction] = useState<ActionKey>('purchase')
  const execute = (fn: () => void, success: string) => { try { fn(); toast.success(success); return true } catch (error) { toast.error(err(error)); return false } }

  return <div className="page-stack operations-page">
    <section className="section-intro operations-intro"><div><span className="eyebrow">GROUP → ASSET</span><h2>العمليات المالية</h2><p>المجموعة هي الحاوية التنظيمية الوحيدة. الأصل هو الحقيقة المالية التي تحمل الرصيد/الكمية والمالك والتكلفة والتقييم وتتم عليها الحركات.</p></div><button className="secondary operations-convert" onClick={goTrade}><ArrowLeftRight size={17}/> تحويل / تسييل أصل</button></section>
    <section className="action-picker">{actions.map(item => { const Icon = item.icon; return <button key={item.id} className={action === item.id ? 'action-choice active' : 'action-choice'} onClick={() => setAction(item.id)}><Icon size={18}/><span><strong>{item.title}</strong><small>{item.sub}</small></span></button> })}</section>
    <section className="operation-workspace"><div className="operation-form-panel">
      {action === 'purchase' && <PurchaseForm state={state} groups={groups} portfolios={portfolios} onSubmit={input => execute(() => finance.purchaseAsset(input), `تم تسجيل شراء «${input.name}».`)}/>} 
      {action === 'asset' && <AssetForm groups={groups} owners={owners} onSubmit={input => execute(() => finance.createAsset(input), `تم إنشاء الأصل «${input.name}».`)}/>} 
      {action === 'funds' && <FundsForm state={state} owners={owners} assets={assets} onOpening={input => execute(() => finance.setAssetOpeningBalance(input), 'تم حفظ/تصحيح الرصيد الافتتاحي لنفس الأصل.')} onIncome={input => execute(() => finance.addIncomeToAsset(input), 'تم تسجيل الدخل وإضافته إلى الأصل النقدي.')}/>} 
      {action === 'transfer' && <TransferForm groups={groups} owners={owners} assets={assets} onSubmit={input => execute(() => finance.transferBetweenAssets(input), 'تم تسجيل نقل الأموال وحفظ كميات المصدر والوجهة وسعر التحويل.')}/>} 
      {action === 'portfolio' && <PortfolioForm owners={owners} portfolios={portfolios} onSubmit={input => execute(() => finance.createPortfolio(input), 'تم إنشاء المحفظة.')}/>} 
      {action === 'allocate' && <AllocateForm state={state} owners={owners} assets={assets.filter(h => h.quantity > 0)} portfolios={portfolios} onSubmit={input => execute(() => finance.allocateToPortfolio(input), 'تم التخصيص دون تغيير تموضع الأصل.')}/>} 
    </div><aside className="operation-help"><CirclePlus size={20}/><strong>القاعدة</strong><p>{helpFor(action)}</p><div className="operation-rule"><span>إعادة تسمية الأصل أو نقله بين المجموعات تنظيم فقط. تغيير الكمية أو المالك أو حركة سابقة هو تصحيح مالي يُحفظ أثره.</span></div></aside></section>
  </div>
}

function PurchaseForm({ state, groups, portfolios, onSubmit }: { state: FinanceState; groups: FinanceState['accountGroups']; portfolios: Portfolio[]; onSubmit: (input: SimplifiedPurchaseInput) => boolean }) {
  const cashAssets = state.holdings.filter(h => !h.archived && h.kind === 'cash' && ownerQuantity(h, SELF_ID) > 0)
  const [sourceHoldingId, setSource] = useState('')
  const [amountPaid, setAmount] = useState('')
  const [targetMode, setTargetMode] = useState<PurchaseTargetMode>('new')
  const [targetAssetId, setTargetAsset] = useState('')
  const [targetGroupId, setTargetGroup] = useState('')
  const [assetTypeId, setAssetType] = useState<AssetTypeId>('gold')
  const definition = assetTypeById(assetTypeId)!
  const [name, setName] = useState(definition.label)
  const [symbol, setSymbol] = useState(definition.defaultSymbol ?? '')
  const [quantity, setQuantity] = useState('')
  const [portfolioId, setPortfolio] = useState('')
  const [location, setLocation] = useState('')
  const [extraCosts, setExtraCosts] = useState('0')
  const [quote, setQuote] = useState<MarketQuote | null>(null)
  const [quoteState, setQuoteState] = useState<'idle'|'loading'|'live'|'fallback'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const selectedTarget = state.holdings.find(h => h.id === targetAssetId && !h.archived)
  const effectiveName = selectedTarget?.name ?? (name.trim() || definition.label)
  const effectiveSymbol = selectedTarget?.symbol ?? (symbol.trim() || (definition.defaultSymbol ?? ''))
  const targetAverage = selectedTarget ? ownerWeightedAverageCostSar(selectedTarget, SELF_ID) : null
  const existingEligible = (asset: Holding) => asset.kind === definition.kind && (!asset.assetTypeId || asset.assetTypeId === assetTypeId) && !asset.ownership.some(s => s.ownerId !== SELF_ID && s.quantity > 0)
  const sourceEligible = (asset: Holding) => asset.kind === 'cash' && ownerQuantity(asset, SELF_ID) > 0

  useEffect(() => {
    const next = assetTypeById(assetTypeId)!
    if (targetMode === 'new') {
      setSymbol(next.defaultSymbol ?? '')
      if (assetTypeId === 'gold' || assetTypeId === 'silver') setName(next.label)
    }
    setTargetAsset('')
    setQuote(null)
  }, [assetTypeId])

  useEffect(() => {
    if (targetMode !== 'existing' || !selectedTarget) return
    setName(selectedTarget.name)
    setSymbol(selectedTarget.symbol)
  }, [targetMode, selectedTarget?.id])

  useEffect(() => {
    if (!effectiveSymbol.trim() || ['none','manual_appraisal','contractual'].includes(definition.quoteStrategy)) { setQuote(null); setQuoteState('fallback'); return }
    let active = true
    setQuoteState('loading')
    const timer = window.setTimeout(async () => {
      const result = await fetchMarketQuote({ assetTypeId, symbol: effectiveSymbol, quoteStrategy: definition.quoteStrategy })
      if (active) { setQuote(result); setQuoteState(result ? 'live' : 'fallback') }
    }, 450)
    return () => { active = false; window.clearTimeout(timer) }
  }, [assetTypeId, effectiveSymbol, definition.quoteStrategy])

  const input: SimplifiedPurchaseInput = {
    sourceHoldingId,
    ownerId: SELF_ID,
    amountPaid: num(amountPaid || '0'),
    targetAssetId: targetMode === 'existing' ? targetAssetId || undefined : undefined,
    targetGroupId: targetMode === 'new' ? targetGroupId || undefined : undefined,
    assetTypeId,
    name: effectiveName,
    symbol: effectiveSymbol || undefined,
    quantity: num(quantity || '0'),
    extraCostsSar: num(extraCosts || '0'),
    portfolioId: portfolioId || undefined,
    location: targetMode === 'new' ? location || undefined : selectedTarget?.location,
    marketQuote: quote,
  }
  let preview: ReturnType<typeof previewSimplifiedPurchase> | null = null
  try { preview = previewSimplifiedPurchase(state, input) } catch { preview = null }
  if (targetMode === 'existing' && !selectedTarget) preview = null

  const reset = () => {
    const initial = assetTypeById('gold')!
    setSource(''); setAmount(''); setTargetMode('new'); setTargetAsset(''); setTargetGroup('')
    setAssetType('gold'); setName(initial.label); setSymbol(initial.defaultSymbol ?? '')
    setQuantity(''); setPortfolio(''); setLocation(''); setExtraCosts('0')
    setQuote(null); setQuoteState('idle'); setResetKey(key => key + 1)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!preview || submitting) return
    setSubmitting(true)
    try {
      let finalQuote = quote
      if (!finalQuote && effectiveSymbol.trim() && !['none','manual_appraisal','contractual'].includes(definition.quoteStrategy)) {
        finalQuote = await fetchMarketQuote({ assetTypeId, symbol: effectiveSymbol, quoteStrategy: definition.quoteStrategy })
      }
      const success = onSubmit({ ...input, marketQuote: finalQuote })
      if (success) reset()
    } finally {
      setSubmitting(false)
    }
  }

  if (!cashAssets.length) return <EmptyAction title="لا يوجد أصل نقدي صالح للدفع" text="أنشئ أصلًا نقديًا مثل «الراجحي الجاري» ثم سجل رصيده الافتتاحي."/>
  return <FormShell title="شراء أصل" subtitle="اختر مصدر الدفع من الشجرة، ثم أنشئ حيازة جديدة أو أضف Lot مستقلًا إلى حيازة موجودة."><form className="trade-form" onSubmit={submit}>
    <GroupAssetCascader key={`pay-${resetKey}`} groups={groups ?? []} assets={state.holdings} value={sourceHoldingId} onChange={setSource} isEligible={sourceEligible} label="أصل الدفع" placeholder="اختر من الشجرة حتى الأصل النقدي"/>
    <div className="field-grid"><Field label="المبلغ المدفوع"><input value={amountPaid} onChange={e => setAmount(e.target.value)} inputMode="decimal"/></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">السيولة الحرة</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setAssetType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(x => <option key={x.id} value={x.id}>{x.groupLabel} — {x.label}</option>)}</select></Field>
    <Field label="وجهة الشراء"><select value={targetMode} onChange={e => { const mode = e.target.value as PurchaseTargetMode; setTargetMode(mode); setTargetAsset(''); setTargetGroup(''); setQuote(null) }}><option value="new">إنشاء أصل / حيازة جديدة</option><option value="existing">زيادة أصل موجود وإعادة حساب متوسط التكلفة</option></select></Field>

    {targetMode === 'existing' ? <>
      <GroupAssetCascader key={`target-${assetTypeId}-${resetKey}`} groups={groups ?? []} assets={state.holdings} value={targetAssetId} onChange={setTargetAsset} isEligible={existingEligible} label="الأصل الموجود" placeholder="اختر الحيازة التي ستستقبل الدفعة"/>
      {selectedTarget && <div className="purchase-summary"><Summary label="الحيازة الحالية" value={`${selectedTarget.quantity.toLocaleString('ar-SA')} ${selectedTarget.nativeUnit}`}/><Summary label="متوسط التكلفة الحالي" value={targetAverage == null ? 'غير معروف' : `${money.format(targetAverage)} ر.س`}/><Summary label="المجموعة" value={(groups ?? []).find(g => g.id === selectedTarget.groupId)?.name ?? 'بدون مجموعة'}/></div>}
    </> : <>
      <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)}/></Field><Field label="الرمز"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}/></Field></div>
      <GroupCascader key={`group-${resetKey}`} groups={groups ?? []} value={targetGroupId} onChange={setTargetGroup} label="تموضع الأصل"/>
      <details className="optional-details"><summary>تفاصيل إضافية</summary><Field label="الموقع الجغرافي"><input value={location} onChange={e => setLocation(e.target.value)}/></Field></details>
    </>}

    <div className="field-grid"><Field label={`كمية الدفعة (${selectedTarget?.nativeUnit ?? definition.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="رسوم/تكاليف إضافية"><input value={extraCosts} onChange={e => setExtraCosts(e.target.value)} inputMode="decimal"/></Field></div>
    <div className="purchase-summary"><Summary label="Cost Basis للدفعة" value={preview ? `${money.format(preview.totalCostBasisSar)} ر.س` : '—'}/><Summary label="تكلفة الدفعة / وحدة" value={preview ? `${money.format(preview.effectiveUnitCostSar)} ر.س` : '—'}/><Summary label="التقييم" value={quoteState === 'loading' ? 'جاري الجلب…' : quote ? `${money.format(quote.unitPriceSar)} ر.س` : selectedTarget ? `${money.format(selectedTarget.marketPriceSar)} ر.س حاليًا` : 'من التكلفة مؤقتًا'}/></div>
    <button className="primary wide" type="submit" disabled={!preview || submitting}>{submitting ? 'جاري التسجيل…' : targetMode === 'existing' ? 'تأكيد الشراء الإضافي' : 'تأكيد الشراء'}</button>
  </form></FormShell>
}

function AssetForm({ groups, owners, onSubmit }: { groups: FinanceState['accountGroups']; owners: Party[]; onSubmit: (input: CreateAssetInput) => void }) {
  const [assetType,setAssetType]=useState<NewAssetType>('cash')
  const cash=assetType==='cash'; const def=cash?undefined:assetTypeById(assetType)!
  const [groupId,setGroup]=useState(''); const [ownerId,setOwner]=useState(owners.find(o=>o.id===SELF_ID)?.id??owners[0]?.id??'')
  const [name,setName]=useState(''); const [currency,setCurrency]=useState('SAR'); const [accountKind,setAccountKind]=useState<AccountKind>('checking'); const [last4,setLast4]=useState(''); const [institution,setInstitution]=useState('')
  const [symbol,setSymbol]=useState(''); const [quantity,setQuantity]=useState('0'); const [cost,setCost]=useState(''); const [current,setCurrent]=useState(''); const [description,setDescription]=useState('')
  useEffect(()=>{if(!cash&&def){setSymbol(def.defaultSymbol??'');if(!name.trim())setName(def.label)}},[assetType])
  const submit=(e:FormEvent)=>{e.preventDefault();const kind=cash?'cash' as const:def!.kind;const sym=cash?currency:(symbol||def!.defaultSymbol||name.slice(0,5));const q=Math.max(0,num(quantity||'0'));const market=cash?(currencyReferenceRateSar(currency)??(current?num(current):1)):(current?num(current):cost&&q>0?num(cost)/q:1);onSubmit({name:name||(cash?`أصل ${currency}`:def!.label),kind,assetTypeId:cash?undefined:def!.id,symbol:sym,nativeUnit:cash?currency:def!.defaultUnit,ownerId,quantity:q,costBasisSar:cost?num(cost):undefined,marketPriceSar:market,groupId:groupId||undefined,accountKind:cash?accountKind:undefined,currency:cash?currency:undefined,last4:cash?last4||undefined:undefined,institutionName:cash?institution||undefined:undefined,description:description||undefined,performanceRole:cash?'transactional_cash':def!.defaultPerformanceRole});setName('');setQuantity('0');setCost('');setCurrent('');setDescription('')}
  return <FormShell title="إضافة أصل موجود" subtitle="أدخل فقط البيانات التي تعرّف الأصل وقيمته. التفاصيل النادرة لا تشغل نموذج الإدخال الأساسي."><form className="trade-form" onSubmit={submit}>
    <Field label="نوع الأصل"><select value={assetType} onChange={e=>setAssetType(e.target.value as NewAssetType)}><option value="cash">النقد والعملات — أصل نقدي / مصرفي</option>{assetTypeCatalog.map(x=><option key={x.id} value={x.id}>{x.groupLabel} — {x.label}</option>)}</select></Field>
    <GroupCascader groups={groups??[]} value={groupId} onChange={setGroup} label="المجموعة"/>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e=>setName(e.target.value)} placeholder={cash?'الراجحي الجاري / خزنة المنزل':def?.label}/></Field><Field label="المالك"><select value={ownerId} onChange={e=>setOwner(e.target.value)}>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div>
    {cash?<><div className="field-grid three"><Field label="العملة"><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencyCatalog.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></Field><Field label="طبيعة الأصل النقدي"><select value={accountKind} onChange={e=>setAccountKind(e.target.value as AccountKind)}>{accountKinds.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="آخر 4 أرقام"><input value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,'').slice(0,4))}/></Field></div><Field label="البنك/المؤسسة"><input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="مصرف الراجحي"/></Field></>:<Field label="الرمز"><input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} placeholder={def?.defaultSymbol||''}/></Field>}
    <div className="field-grid three"><Field label="الكمية / الرصيد"><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="التكلفة التاريخية الكلية"><input value={cost} onChange={e=>setCost(e.target.value)} inputMode="decimal" placeholder="اختياري"/></Field><Field label="القيمة الحالية للوحدة"><input value={current} onChange={e=>setCurrent(e.target.value)} inputMode="decimal" placeholder="تلقائي عند توفر مرجع"/></Field></div>
    <details className="optional-details"><summary>تفاصيل إضافية</summary><Field label="وصف"><input value={description} onChange={e=>setDescription(e.target.value)}/></Field></details>
    <button className="primary wide" type="submit">إضافة الأصل</button>
  </form></FormShell>
}

function FundsForm({ state, owners, assets, onOpening, onIncome }: { state: FinanceState; owners: Party[]; assets: Holding[]; onOpening: (i: SetAssetOpeningBalanceInput) => void; onIncome: (i: AddAssetIncomeInput) => void }) {
  const cash = assets.filter(a => a.kind === 'cash'); const [assetId, setAsset] = useState(''); const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? ''); const [quantity, setQuantity] = useState(''); const [kind, setKind] = useState<'opening'|'income'>('opening'); const [title, setTitle] = useState('')
  const asset = cash.find(a => a.id === assetId)
  const submit = (e: FormEvent) => { e.preventDefault(); const q = num(quantity); if (kind === 'opening') onOpening({ assetId, ownerId, quantity: q, unitCostSar: asset?.marketPriceSar, title: title || undefined }); else onIncome({ assetId, ownerId, quantity: q, title: title || undefined }); setQuantity(''); setTitle('') }
  if (!cash.length) return <EmptyAction title="لا توجد أصول نقدية" text="أنشئ أصلًا نقديًا أولًا."/>
  return <FormShell title="إضافة أموال" subtitle="اختر الأصل النقدي مباشرة. الرصيد الافتتاحي واحد ويُصحح بدل تكراره."><form className="trade-form" onSubmit={submit}><Field label="الأصل النقدي"><select value={assetId} onChange={e => setAsset(e.target.value)}><option value="">اختر الأصل</option>{cash.map(a => <option key={a.id} value={a.id}>{a.name} — {a.symbol}</option>)}</select></Field><div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="النوع"><select value={kind} onChange={e => setKind(e.target.value as 'opening'|'income')}><option value="opening">رصيد افتتاحي / تصحيح</option><option value="income">دخل جديد</option></select></Field></div><Field label={`المبلغ ${asset ? `(${asset.nativeUnit})` : ''}`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="العنوان (اختياري)"><input value={title} onChange={e => setTitle(e.target.value)}/></Field><button className="primary wide" disabled={!assetId} type="submit">{kind === 'opening' ? 'حفظ الرصيد الافتتاحي' : 'إضافة الدخل'}</button></form></FormShell>
}

function TransferForm({ groups, owners, assets, onSubmit }: { groups: FinanceState['accountGroups']; owners: Party[]; assets: Holding[]; onSubmit: (i: TransferBetweenAssetsInput) => boolean }) {
  const cash = assets.filter(a => a.kind === 'cash')
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [quantity, setQuantity] = useState('')
  const [fxEntryMode, setFxEntryMode] = useState<FxEntryMode>('target_amount')
  const [targetAmount, setTargetAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const sourceAsset = cash.find(a => a.id === source)
  const targetAsset = cash.find(a => a.id === target)
  const differentCurrency = Boolean(sourceAsset && targetAsset && sourceAsset.symbol.toUpperCase() !== targetAsset.symbol.toUpperCase())
  const sourceQuantity = num(quantity || '0')
  const enteredTarget = num(targetAmount || '0')
  const enteredRate = num(exchangeRate || '0')
  const derivedTarget = differentCurrency ? (fxEntryMode === 'target_amount' ? enteredTarget : enteredRate > 0 ? sourceQuantity / enteredRate : 0) : sourceQuantity
  const derivedRate = differentCurrency ? (fxEntryMode === 'exchange_rate' ? enteredRate : enteredTarget > 0 ? sourceQuantity / enteredTarget : 0) : 1
  const validFx = !differentCurrency || (derivedTarget > 0 && derivedRate > 0)

  useEffect(() => {
    if (target === source) setTarget('')
    setTargetAmount('')
    setExchangeRate('')
  }, [source])

  useEffect(() => {
    setTargetAmount('')
    setExchangeRate('')
  }, [target, fxEntryMode])

  const reset = () => {
    setSource(''); setTarget(''); setQuantity(''); setTargetAmount(''); setExchangeRate(''); setFxEntryMode('target_amount'); setResetKey(k => k + 1)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const input: TransferBetweenAssetsInput = {
      sourceAssetId: source,
      targetAssetId: target,
      ownerId,
      quantity: sourceQuantity,
      targetQuantity: differentCurrency && fxEntryMode === 'target_amount' ? enteredTarget : undefined,
      exchangeRate: differentCurrency && fxEntryMode === 'exchange_rate' ? enteredRate : undefined,
    }
    if (onSubmit(input)) reset()
  }

  const sourceEligible = (asset: Holding) => asset.kind === 'cash' && ownerQuantity(asset, ownerId) > 0
  const targetEligible = (asset: Holding) => asset.kind === 'cash' && asset.id !== source

  return <FormShell title="نقل أموال" subtitle="انقل بين حسابات نقدية بأي عملة. عند اختلاف العملة أدخل المبلغ النهائي أو سعر التحويل، وسيشتق النظام الآخر ويحفظ الاثنين."><form className="trade-form" onSubmit={submit}>
    <Field label="المالك"><select value={ownerId} onChange={e => { setOwner(e.target.value); reset() }}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <GroupAssetCascader key={`transfer-source-${ownerId}-${resetKey}`} groups={groups ?? []} assets={cash} value={source} onChange={setSource} isEligible={sourceEligible} label="من حساب / أصل نقدي" placeholder="اختر المصدر من الشجرة"/>
    <GroupAssetCascader key={`transfer-target-${source}-${resetKey}`} groups={groups ?? []} assets={cash} value={target} onChange={setTarget} isEligible={targetEligible} label="إلى حساب / أصل نقدي" placeholder="اختر الوجهة من الشجرة"/>
    <Field label={`المبلغ المخصوم من المصدر${sourceAsset ? ` (${sourceAsset.symbol})` : ''}`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field>

    {differentCurrency && sourceAsset && targetAsset && <>
      <Field label="طريقة إدخال التحويل"><select value={fxEntryMode} onChange={e => setFxEntryMode(e.target.value as FxEntryMode)}><option value="target_amount">أدخل المبلغ النهائي في حساب الوجهة</option><option value="exchange_rate">أدخل سعر الوحدة / سعر التحويل</option></select></Field>
      {fxEntryMode === 'target_amount'
        ? <Field label={`المبلغ المستلم (${targetAsset.symbol})`}><input value={targetAmount} onChange={e => setTargetAmount(e.target.value)} inputMode="decimal" placeholder="مثال: 266.67"/></Field>
        : <Field label={`سعر التحويل — ${sourceAsset.symbol} لكل 1 ${targetAsset.symbol}`}><input value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} inputMode="decimal" placeholder="مثال: 3.75"/></Field>}
      <div className="purchase-summary">
        <Summary label="من المصدر" value={sourceQuantity > 0 ? `${sourceQuantity.toLocaleString('ar-SA', { maximumFractionDigits: 8 })} ${sourceAsset.symbol}` : '—'}/>
        <Summary label="إلى الوجهة" value={derivedTarget > 0 ? `${derivedTarget.toLocaleString('ar-SA', { maximumFractionDigits: 8 })} ${targetAsset.symbol}` : '—'}/>
        <Summary label="سعر التحويل" value={derivedRate > 0 ? `${derivedRate.toLocaleString('ar-SA', { maximumFractionDigits: 8 })} ${sourceAsset.symbol}/${targetAsset.symbol}` : '—'}/>
      </div>
    </>}

    <button className="primary wide" disabled={!source || !target || sourceQuantity <= 0 || !validFx} type="submit">{differentCurrency ? 'نقل وتحويل الأموال' : 'نقل الأموال'}</button>
  </form></FormShell>
}

function PortfolioForm({ owners, portfolios, onSubmit }: { owners: Party[]; portfolios: Portfolio[]; onSubmit: (input: CreatePortfolioInput) => void }) {
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? ''); const [name, setName] = useState(''); const [profile, setProfile] = useState<PortfolioProfile>('investment'); const [parentId, setParent] = useState(''); const [purpose, setPurpose] = useState(''); const [target, setTarget] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, ownerId, parentId: parentId || undefined, profile, purpose: purpose || undefined, targetValueSar: target ? num(target) : undefined, protectionMode: 'flexible' }); setName('') }
  return <FormShell title="إنشاء محفظة" subtitle="المحفظة تجيب «لماذا؟» ولا تحتوي الأصل تنظيميًا."><form className="trade-form" onSubmit={submit}><div className="field-grid"><Field label="اسم المحفظة"><input value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="المالك"><select value={ownerId} onChange={e=>setOwner(e.target.value)}>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div><div className="field-grid"><Field label="السلوك"><select value={profile} onChange={e=>setProfile(e.target.value as PortfolioProfile)}>{profiles.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="محفظة أم"><select value={parentId} onChange={e=>setParent(e.target.value)}><option value="">جذرية</option>{portfolios.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><Field label="الغرض"><input value={purpose} onChange={e=>setPurpose(e.target.value)}/></Field><Field label="الهدف بالريال"><input value={target} onChange={e=>setTarget(e.target.value)} inputMode="decimal"/></Field><button className="primary wide" type="submit">إنشاء المحفظة</button></form></FormShell>
}

function AllocateForm({ state, owners, assets, portfolios, onSubmit }: { state: FinanceState; owners: Party[]; assets: Holding[]; portfolios: Portfolio[]; onSubmit: (input: AllocateToPortfolioInput) => void }) {
  const [ownerId,setOwner]=useState(owners.find(o=>o.id===SELF_ID)?.id??owners[0]?.id??''); const eligible=useMemo(()=>assets.filter(h=>ownerQuantity(h,ownerId)>0),[assets,ownerId]); const [holdingId,setHolding]=useState(''); const [portfolioId,setPortfolio]=useState(portfolios[0]?.id??''); const [quantity,setQuantity]=useState(''); const holding=eligible.find(h=>h.id===holdingId); const free=holding?availableQuantity(state,holding.id,ownerId):0
  return <FormShell title="تخصيص لمحفظة" subtitle="التخصيص لا ينقل الأصل من مجموعته."><form className="trade-form" onSubmit={e=>{e.preventDefault();onSubmit({holdingId,ownerId,portfolioId,quantity:num(quantity)})}}><Field label="المالك"><select value={ownerId} onChange={e=>{setOwner(e.target.value);setHolding('')}}>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="الأصل"><select value={holdingId} onChange={e=>setHolding(e.target.value)}><option value="">اختر الأصل</option>{eligible.map(h=><option key={h.id} value={h.id}>{h.name} — حر {availableQuantity(state,h.id,ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field><div className="field-grid"><Field label="الكمية"><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal"/><small>المتاح: {free.toLocaleString('ar-SA')} {holding?.nativeUnit}</small></Field><Field label="المحفظة"><select value={portfolioId} onChange={e=>setPortfolio(e.target.value)}>{portfolios.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><button className="primary wide" type="submit">تخصيص</button></form></FormShell>
}

function FormShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="panel operation-form"><div className="panel-head"><div><span>تنفيذ على بياناتك</span><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span>{label}</span>{children}</label> }
function Summary({label,value}:{label:string;value:string}){return <div className="purchase-summary-item"><span>{label}</span><strong>{value}</strong></div>}
function EmptyAction({title,text}:{title:string;text:string}){return <div className="panel empty-preview"><CirclePlus/><strong>{title}</strong><span>{text}</span></div>}
function helpFor(action: ActionKey){return ({purchase:'اختر أصل الدفع من الشجرة. يمكن للشراء إنشاء حيازة جديدة أو إضافة Lot مستقل إلى أصل موجود دون دمج تلقائي.',asset:'سجّل الأصل الموجود بأقل بيانات لازمة. البنك أو نوع الحساب خصائص للأصل النقدي وليسا حاوية مستقلة.',funds:'الرصيد الافتتاحي مرتبط بالأصل نفسه ويسجل مرة واحدة؛ الدخل حركة متكررة.',transfer:'المصدر والوجهة أصول نقدية نهائية من الشجرة. إذا اختلفت العملة تحفظ الحركة مبلغ المصدر ومبلغ الوجهة وسعر التحويل دون تخمين.',portfolio:'المحفظة غرض اقتصادي مستقل عن شجرة المجموعات.',allocate:'التخصيص يغير الغرض لا التموضع التنظيمي.'} as Record<ActionKey,string>)[action]}
