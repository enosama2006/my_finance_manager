import { ArrowLeftRight, BanknoteArrowDown, Boxes, CirclePlus, FolderPlus, PackagePlus, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { AllocateToPortfolioInput, CreatePortfolioInput } from '../application/commands'
import type { CreateAssetInput } from '../application/assets'
import type { AddAssetIncomeInput, SetAssetOpeningBalanceInput, TransferBetweenAssetsInput } from '../application/assetTransactions'
import { previewSimplifiedPurchase, type SimplifiedPurchaseInput } from '../application/purchase'
import { GroupCascader } from '../components/GroupCascader'
import { useToast } from '../components/ToastProvider'
import { assetTypeById, assetTypeCatalog, type AssetTypeId } from '../domain/assetCatalog'
import { currencyCatalog, currencyReferenceRateSar } from '../domain/currencies'
import { availableQuantity, ownerQuantity } from '../domain/finance'
import type { AccountKind, AssetKind, FinanceState, Holding, Party, Portfolio, PortfolioProfile } from '../domain/types'
import { fetchMarketQuote, type MarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const num = (value: string) => Number(value.replace(/,/g, ''))
const err = (error: unknown) => error instanceof Error ? error.message : 'تعذر تنفيذ العملية'

type ActionKey = 'purchase' | 'asset' | 'funds' | 'transfer' | 'portfolio' | 'allocate'
const actions: { id: ActionKey; title: string; sub: string; icon: typeof ShoppingCart }[] = [
  { id: 'purchase', title: 'شراء أصل', sub: 'أصل نقدي ← أصل جديد', icon: ShoppingCart },
  { id: 'asset', title: 'إضافة أصل', sub: 'نقد، معدن، عقار، صندوق…', icon: PackagePlus },
  { id: 'funds', title: 'إضافة أموال', sub: 'افتتاحي واحد أو دخل متكرر', icon: BanknoteArrowDown },
  { id: 'transfer', title: 'نقل أموال', sub: 'أصل نقدي إلى أصل نقدي', icon: ArrowLeftRight },
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
      {action === 'purchase' && <PurchaseForm state={state} groups={groups} portfolios={portfolios} onSubmit={input => execute(() => finance.purchaseAsset(input), `تم شراء «${input.name}» ووضعه في المجموعة المختارة.`)}/>} 
      {action === 'asset' && <AssetForm state={state} groups={groups} owners={owners} onSubmit={input => execute(() => finance.createAsset(input), `تم إنشاء الأصل «${input.name}».`)}/>} 
      {action === 'funds' && <FundsForm state={state} owners={owners} assets={assets} onOpening={input => execute(() => finance.setAssetOpeningBalance(input), 'تم حفظ/تصحيح الرصيد الافتتاحي لنفس الأصل.')} onIncome={input => execute(() => finance.addIncomeToAsset(input), 'تم تسجيل الدخل وإضافته إلى الأصل النقدي.')}/>} 
      {action === 'transfer' && <TransferForm owners={owners} assets={assets} onSubmit={input => execute(() => finance.transferBetweenAssets(input), 'تم النقل بين الأصلين دون ربح أو خسارة.')}/>} 
      {action === 'portfolio' && <PortfolioForm owners={owners} portfolios={portfolios} onSubmit={input => execute(() => finance.createPortfolio(input), 'تم إنشاء المحفظة.')}/>} 
      {action === 'allocate' && <AllocateForm state={state} owners={owners} assets={assets.filter(h => h.quantity > 0)} portfolios={portfolios} onSubmit={input => execute(() => finance.allocateToPortfolio(input), 'تم التخصيص دون تغيير تموضع الأصل.')}/>} 
    </div><aside className="operation-help"><CirclePlus size={20}/><strong>القاعدة</strong><p>{helpFor(action)}</p><div className="operation-rule"><span>إعادة تسمية الأصل أو نقله بين المجموعات تنظيم فقط. تغيير الكمية أو المالك أو حركة سابقة هو تصحيح مالي يُحفظ أثره.</span></div></aside></section>
  </div>
}

function PurchaseForm({ state, groups, portfolios, onSubmit }: { state: FinanceState; groups: FinanceState['accountGroups']; portfolios: Portfolio[]; onSubmit: (input: SimplifiedPurchaseInput) => void }) {
  const cashAssets = state.holdings.filter(h => !h.archived && h.kind === 'cash' && ownerQuantity(h, SELF_ID) > 0)
  const [sourceHoldingId, setSource] = useState(''); const [amountPaid, setAmount] = useState(''); const [targetGroupId, setTargetGroup] = useState('')
  const [assetTypeId, setAssetType] = useState<AssetTypeId>('gold'); const definition = assetTypeById(assetTypeId)!
  const [name, setName] = useState(definition.label); const [symbol, setSymbol] = useState(definition.defaultSymbol ?? ''); const [quantity, setQuantity] = useState('')
  const [portfolioId, setPortfolio] = useState(''); const [location, setLocation] = useState(''); const [extraCosts, setExtraCosts] = useState('0')
  const [quote, setQuote] = useState<MarketQuote | null>(null); const [quoteState, setQuoteState] = useState<'idle'|'loading'|'live'|'fallback'>('idle')
  useEffect(() => { const next = assetTypeById(assetTypeId)!; setSymbol(next.defaultSymbol ?? ''); if (assetTypeId === 'gold' || assetTypeId === 'silver') setName(next.label); setQuote(null) }, [assetTypeId])
  useEffect(() => {
    if (!symbol.trim() || ['none','manual_appraisal','contractual'].includes(definition.quoteStrategy)) { setQuote(null); setQuoteState('fallback'); return }
    let active = true; setQuoteState('loading'); const timer = window.setTimeout(async () => { const result = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy }); if (active) { setQuote(result); setQuoteState(result ? 'live' : 'fallback') } }, 450)
    return () => { active = false; window.clearTimeout(timer) }
  }, [assetTypeId, symbol, definition.quoteStrategy])
  const input: SimplifiedPurchaseInput = { sourceHoldingId, ownerId: SELF_ID, amountPaid: num(amountPaid || '0'), targetGroupId: targetGroupId || undefined, assetTypeId, name: name.trim() || definition.label, symbol: symbol.trim() || definition.defaultSymbol, quantity: num(quantity || '0'), extraCostsSar: num(extraCosts || '0'), portfolioId: portfolioId || undefined, location: location || undefined, marketQuote: quote }
  let preview: ReturnType<typeof previewSimplifiedPurchase> | null = null; try { preview = previewSimplifiedPurchase(state, input) } catch { preview = null }
  const submit = async (e: FormEvent) => { e.preventDefault(); let finalQuote = quote; if (!finalQuote && symbol.trim() && !['none','manual_appraisal','contractual'].includes(definition.quoteStrategy)) finalQuote = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy }); onSubmit({ ...input, marketQuote: finalQuote }) }
  if (!cashAssets.length) return <EmptyAction title="لا يوجد أصل نقدي صالح للدفع" text="أنشئ أصلًا نقديًا مثل «الراجحي الجاري» ثم سجل رصيده الافتتاحي."/>
  return <FormShell title="شراء أصل" subtitle="الخصم يتم من أصل نقدي، والأصل المشترى يوضع مباشرة تحت مجموعة؛ لا توجد طبقة حساب حفظ."><form className="trade-form" onSubmit={submit}>
    <Field label="أصل الدفع"><select value={sourceHoldingId} onChange={e => setSource(e.target.value)}><option value="">اختر الأصل النقدي</option>{cashAssets.map(h => <option key={h.id} value={h.id}>{h.name} — {ownerQuantity(h, SELF_ID).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field>
    <div className="field-grid"><Field label="المبلغ المدفوع"><input value={amountPaid} onChange={e => setAmount(e.target.value)} inputMode="decimal"/></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">السيولة الحرة</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setAssetType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(x => <option key={x.id} value={x.id}>{x.groupLabel} — {x.label}</option>)}</select></Field>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)}/></Field><Field label="الرمز"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}/></Field></div>
    <div className="field-grid"><Field label={`الكمية (${definition.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="رسوم/تكاليف إضافية"><input value={extraCosts} onChange={e => setExtraCosts(e.target.value)} inputMode="decimal"/></Field></div>
    <GroupCascader groups={groups ?? []} value={targetGroupId} onChange={setTargetGroup} label="تموضع الأصل"/>
    <Field label="الموقع الجغرافي (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)}/></Field>
    <div className="purchase-summary"><Summary label="Cost Basis" value={preview ? `${money.format(preview.totalCostBasisSar)} ر.س` : '—'}/><Summary label="التكلفة / وحدة" value={preview ? `${money.format(preview.effectiveUnitCostSar)} ر.س` : '—'}/><Summary label="التقييم" value={quoteState === 'loading' ? 'جاري الجلب…' : quote ? `${money.format(quote.unitPriceSar)} ر.س` : 'من التكلفة مؤقتًا'}/></div>
    <button className="primary wide" type="submit" disabled={!preview}>تأكيد الشراء</button>
  </form></FormShell>
}

function AssetForm({ state, groups, owners, onSubmit }: { state: FinanceState; groups: FinanceState['accountGroups']; owners: Party[]; onSubmit: (input: CreateAssetInput) => void }) {
  const [mode, setMode] = useState<'cash'|'catalog'>('cash'); const [typeId, setTypeId] = useState<AssetTypeId>('gold'); const def = assetTypeById(typeId)!
  const [groupId, setGroup] = useState(''); const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [name, setName] = useState(''); const [currency, setCurrency] = useState('SAR'); const [accountKind, setAccountKind] = useState<AccountKind>('checking'); const [last4, setLast4] = useState(''); const [institution, setInstitution] = useState('')
  const [symbol, setSymbol] = useState(''); const [quantity, setQuantity] = useState('0'); const [cost, setCost] = useState(''); const [current, setCurrent] = useState(''); const [location, setLocation] = useState(''); const [description, setDescription] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); const cash = mode === 'cash'; const kind: AssetKind = cash ? 'cash' : def.kind; const sym = cash ? currency : (symbol || def.defaultSymbol || name.slice(0,5)); const q = Math.max(0, num(quantity || '0')); const market = cash ? (currencyReferenceRateSar(currency) ?? (current ? num(current) : 1)) : (current ? num(current) : cost && q > 0 ? num(cost)/q : 1); onSubmit({ name: name || (cash ? `أصل ${currency}` : def.label), kind, assetTypeId: cash ? undefined : def.id, symbol: sym, nativeUnit: cash ? currency : def.defaultUnit, ownerId, quantity: q, costBasisSar: cost ? num(cost) : undefined, marketPriceSar: market, groupId: groupId || undefined, accountKind: cash ? accountKind : undefined, currency: cash ? currency : undefined, last4: cash ? last4 || undefined : undefined, institutionName: cash ? institution || undefined : undefined, description: description || undefined, location: location || undefined, performanceRole: cash ? 'transactional_cash' : def.defaultPerformanceRole }); setName(''); setQuantity('0'); setCost(''); setCurrent('') }
  return <FormShell title="إضافة أصل" subtitle="كل ما تملكه أصل. المجموعة تنظمه فقط، ولا يوجد حساب حاوي للأصل."><form className="trade-form" onSubmit={submit}>
    <Field label="فئة الإدخال"><select value={mode} onChange={e => setMode(e.target.value as 'cash'|'catalog')}><option value="cash">أصل نقدي / مصرفي</option><option value="catalog">أصل آخر</option></select></Field>
    {mode === 'catalog' && <Field label="نوع الأصل"><select value={typeId} onChange={e => setTypeId(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(x => <option key={x.id} value={x.id}>{x.groupLabel} — {x.label}</option>)}</select></Field>}
    <GroupCascader groups={groups ?? []} value={groupId} onChange={setGroup} label="المجموعة"/>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder={mode === 'cash' ? 'الراجحي الجاري / خزنة المنزل' : def.label}/></Field><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div>
    {mode === 'cash' ? <><div className="field-grid three"><Field label="العملة"><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencyCatalog.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></Field><Field label="طبيعة الأصل النقدي"><select value={accountKind} onChange={e => setAccountKind(e.target.value as AccountKind)}>{accountKinds.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="آخر 4 أرقام"><input value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g,'').slice(0,4))}/></Field></div><Field label="البنك/المؤسسة (معلومة اختيارية)"><input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="مصرف الراجحي"/></Field></> : <div className="field-grid"><Field label="الرمز"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder={def.defaultSymbol || ''}/></Field><Field label="الموقع (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)}/></Field></div>}
    <div className="field-grid three"><Field label="الكمية/الرصيد الافتتاحي"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="التكلفة التاريخية الكلية"><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="اختياري"/></Field><Field label="القيمة الحالية للوحدة"><input value={current} onChange={e => setCurrent(e.target.value)} inputMode="decimal" placeholder="تلقائي للعملات المثبتة"/></Field></div>
    <Field label="وصف (اختياري)"><input value={description} onChange={e => setDescription(e.target.value)}/></Field><button className="primary wide" type="submit">إضافة الأصل</button>
  </form></FormShell>
}

function FundsForm({ state, owners, assets, onOpening, onIncome }: { state: FinanceState; owners: Party[]; assets: Holding[]; onOpening: (i: SetAssetOpeningBalanceInput) => void; onIncome: (i: AddAssetIncomeInput) => void }) {
  const cash = assets.filter(a => a.kind === 'cash'); const [assetId, setAsset] = useState(''); const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? ''); const [quantity, setQuantity] = useState(''); const [kind, setKind] = useState<'opening'|'income'>('opening'); const [title, setTitle] = useState('')
  const asset = cash.find(a => a.id === assetId)
  const submit = (e: FormEvent) => { e.preventDefault(); const q = num(quantity); if (kind === 'opening') onOpening({ assetId, ownerId, quantity: q, unitCostSar: asset?.marketPriceSar, title: title || undefined }); else onIncome({ assetId, ownerId, quantity: q, title: title || undefined }); setQuantity(''); setTitle('') }
  if (!cash.length) return <EmptyAction title="لا توجد أصول نقدية" text="أنشئ أصلًا نقديًا أولًا."/>
  return <FormShell title="إضافة أموال" subtitle="اختر الأصل النقدي مباشرة. الرصيد الافتتاحي واحد ويُصحح بدل تكراره."><form className="trade-form" onSubmit={submit}><Field label="الأصل النقدي"><select value={assetId} onChange={e => setAsset(e.target.value)}><option value="">اختر الأصل</option>{cash.map(a => <option key={a.id} value={a.id}>{a.name} — {a.symbol}</option>)}</select></Field><div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="النوع"><select value={kind} onChange={e => setKind(e.target.value as 'opening'|'income')}><option value="opening">رصيد افتتاحي / تصحيح</option><option value="income">دخل جديد</option></select></Field></div><Field label={`المبلغ ${asset ? `(${asset.nativeUnit})` : ''}`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><Field label="العنوان (اختياري)"><input value={title} onChange={e => setTitle(e.target.value)}/></Field><button className="primary wide" disabled={!assetId} type="submit">{kind === 'opening' ? 'حفظ الرصيد الافتتاحي' : 'إضافة الدخل'}</button></form></FormShell>
}

function TransferForm({ owners, assets, onSubmit }: { owners: Party[]; assets: Holding[]; onSubmit: (i: TransferBetweenAssetsInput) => void }) {
  const cash = assets.filter(a => a.kind === 'cash'); const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? ''); const [source, setSource] = useState(''); const sourceAsset = cash.find(a => a.id === source); const targets = cash.filter(a => a.id !== source && (!sourceAsset || a.symbol.toUpperCase() === sourceAsset.symbol.toUpperCase())); const [target, setTarget] = useState(''); const [quantity, setQuantity] = useState('')
  useEffect(() => { if (!targets.some(a => a.id === target)) setTarget('') }, [source])
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ sourceAssetId: source, targetAssetId: target, ownerId, quantity: num(quantity) }); setQuantity('') }
  return <FormShell title="نقل أموال" subtitle="النقل بين أصلين نقديين بنفس العملة؛ تموضعهما في المجموعات لا يتغير."><form className="trade-form" onSubmit={submit}><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="من أصل"><select value={source} onChange={e => setSource(e.target.value)}><option value="">اختر المصدر</option>{cash.filter(a => ownerQuantity(a, ownerId)>0).map(a => <option key={a.id} value={a.id}>{a.name} — {ownerQuantity(a,ownerId).toLocaleString('ar-SA')} {a.nativeUnit}</option>)}</select></Field><Field label="إلى أصل"><select value={target} onChange={e => setTarget(e.target.value)}><option value="">اختر الوجهة</option>{targets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="المبلغ"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal"/></Field><button className="primary wide" disabled={!source || !target} type="submit">نقل الأموال</button></form></FormShell>
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
function helpFor(action: ActionKey){return ({purchase:'الأصل النقدي يُخصم منه، والأصل المشترى يُنشأ مباشرة داخل المجموعة المختارة.',asset:'أنشئ أي شيء تملكه كأصل. البنك أو نوع الحساب مجرد خصائص للأصل النقدي، وليسا حاوية مستقلة.',funds:'الرصيد الافتتاحي مرتبط بالأصل نفسه ويسجل مرة واحدة؛ الدخل حركة متكررة.',transfer:'النقل يحدث من أصل نقدي إلى أصل نقدي آخر بنفس العملة.',portfolio:'المحفظة غرض اقتصادي مستقل عن شجرة المجموعات.',allocate:'التخصيص يغير الغرض لا التموضع التنظيمي.'} as Record<ActionKey,string>)[action]}
