import { ArrowLeftRight, BanknoteArrowDown, Boxes, CirclePlus, FolderPlus, Landmark, PackagePlus, ShoppingCart, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { AddAccountInput, AddFundsInput, AllocateToPortfolioInput, CreatePortfolioInput, ExistingAssetInput, TransferFundsInput } from '../application/commands'
import { previewSimplifiedPurchase, type SimplifiedPurchaseInput } from '../application/purchase'
import { useToast } from '../components/ToastProvider'
import { assetTypeById, assetTypeCatalog, defaultPerformanceRoleForKind, type AssetTypeId } from '../domain/assetCatalog'
import { availableQuantity, ownerQuantity } from '../domain/finance'
import type { Account, AccountKind, Party, PortfolioProfile } from '../domain/types'
import { fetchMarketQuote, type MarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
type ActionKey = 'purchase' | 'transfer' | 'funds' | 'existing' | 'portfolio' | 'allocate' | 'account'

const actions: { id: ActionKey; title: string; sub: string; icon: typeof ShoppingCart }[] = [
  { id: 'purchase', title: 'شراء أصل', sub: 'مكان ← حساب ← أصل', icon: ShoppingCart },
  { id: 'transfer', title: 'نقل أموال', sub: 'بين حسابين بدون P/L', icon: ArrowLeftRight },
  { id: 'funds', title: 'إضافة أموال', sub: 'رصيد افتتاحي أو دخل', icon: BanknoteArrowDown },
  { id: 'existing', title: 'إضافة أصل قائم', sub: 'بدون دفع وهمي', icon: PackagePlus },
  { id: 'portfolio', title: 'إنشاء محفظة', sub: 'غرض وهدف وسلوك', icon: FolderPlus },
  { id: 'allocate', title: 'تخصيص لمحفظة', sub: 'تغيير الغرض فقط', icon: Boxes },
  { id: 'account', title: 'إضافة حساب', sub: 'تحت مكان/جهة محددة', icon: Landmark },
]

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'checking', label: 'حساب جاري' }, { value: 'saving', label: 'حساب ادخار' }, { value: 'investment', label: 'حساب استثماري' },
  { value: 'cash_container', label: 'خزنة / نقد فعلي' }, { value: 'custody', label: 'حفظ أصول' }, { value: 'fixed_term', label: 'استثمار لأجل' },
  { value: 'prepaid', label: 'مسبق الدفع' }, { value: 'credit_card', label: 'بطاقة ائتمان' },
]

const profiles: { value: PortfolioProfile; label: string }[] = [
  { value: 'investment', label: 'استثمار' }, { value: 'savings_goal', label: 'ادخار / هدف' }, { value: 'reserve', label: 'احتياطي' },
  { value: 'commitment', label: 'التزام' }, { value: 'spending_budget', label: 'ميزانية مصروف' }, { value: 'deal', label: 'عملية / صفقة' },
]

function num(value: string) { return Number(value.replace(/,/g, '')) }
function err(error: unknown) { return error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }
function activeAccounts(accounts: Account[], placeId: string) { return accounts.filter(a => a.status === 'active' && a.custodianId === placeId) }
function selectablePlaces(parties: Party[]) { return parties.filter(p => p.type !== 'self') }

export function OperationsV2({ goTrade }: { goTrade: () => void }) {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const places = selectablePlaces(state.parties)
  const accounts = state.accounts.filter(a => a.status === 'active')
  const portfolios = state.portfolios.filter(p => p.status === 'active')
  const holdings = state.holdings.filter(h => !h.archived && h.quantity > 0)
  const [action, setAction] = useState<ActionKey>('purchase')

  const execute = (fn: () => void, success: string) => {
    try { fn(); toast.success(success) } catch (error) { toast.error(err(error)) }
  }

  return <div className="page-stack operations-page">
    <section className="section-intro operations-intro">
      <div><span className="eyebrow">PLACE → ACCOUNT → HOLDING</span><h2>العمليات المالية</h2><p>المكان مثل «مصرف الراجحي» أو «المنزل» هو الجذر. تحته حسابات متعددة، وتحت الحساب يوجد الأصل. الأرض والسهم والصندوق أصول وليست أماكن.</p></div>
      <button className="secondary operations-convert" onClick={goTrade}><ArrowLeftRight size={17} /> تحويل / تسييل أصل</button>
    </section>

    <section className="action-picker">
      {actions.map(item => { const Icon = item.icon; return <button key={item.id} className={action === item.id ? 'action-choice active' : 'action-choice'} onClick={() => setAction(item.id)}><Icon size={18} /><span><strong>{item.title}</strong><small>{item.sub}</small></span></button> })}
    </section>

    <section className="operation-workspace">
      <div className="operation-form-panel">
        {action === 'purchase' && <PurchaseForm state={state} places={places} accounts={accounts} portfolios={portfolios} onSubmit={async input => {
          try { finance.purchaseAsset(input); toast.success(`تم شراء «${input.name}» بنجاح وتحديث الرصيد والتكلفة والمركز.`) } catch (error) { toast.error(err(error)) }
        }} />}
        {action === 'transfer' && <TransferForm state={state} places={places} accounts={accounts} onSubmit={(input: TransferFundsInput) => execute(() => finance.transferFunds(input), 'تم نقل الأموال بنجاح بدون تسجيل ربح أو خسارة.')} />}
        {action === 'funds' && <FundsForm owners={owners} places={places} accounts={accounts} portfolios={portfolios} onSubmit={(input: AddFundsInput) => execute(() => finance.addFunds(input), 'تمت إضافة الرصيد بنجاح.')} />}
        {action === 'existing' && <ExistingAssetForm owners={owners} places={places} accounts={accounts} portfolios={portfolios} onSubmit={(input: ExistingAssetInput) => execute(() => finance.addExistingAsset(input), 'تم تسجيل الأصل القائم بنجاح دون خصم مصرفي وهمي.')} />}
        {action === 'portfolio' && <PortfolioForm owners={owners} portfolios={portfolios} onSubmit={(input: CreatePortfolioInput) => execute(() => finance.createPortfolio(input), 'تم إنشاء المحفظة بنجاح.')} />}
        {action === 'allocate' && <AllocateForm state={state} owners={owners} holdings={holdings} portfolios={portfolios} onSubmit={(input: AllocateToPortfolioInput) => execute(() => finance.allocateToPortfolio(input), 'تم تخصيص الأصل للمحفظة بنجاح بدون حركة نقدية.')} />}
        {action === 'account' && <AccountForm places={places} onSubmit={(input: AddAccountInput) => execute(() => finance.addAccount(input), 'تم إنشاء الحساب بنجاح تحت المكان المختار.')} />}
      </div>
      <aside className="operation-help"><WalletCards size={20} /><strong>قاعدة بسيطة</strong><p>{helpFor(action)}</p><div className="operation-rule"><CirclePlus size={15} /><span>نجاح أو فشل كل عملية يظهر الآن كتأكيد عائم واضح، وتظهر النتيجة فورًا في شجرة المكان والحسابات.</span></div></aside>
    </section>
  </div>
}

function PurchaseForm({ state, places, accounts, portfolios, onSubmit }: any) {
  const [sourcePlaceId, setSourcePlace] = useState(places[0]?.id ?? '')
  const sourceAccounts = activeAccounts(accounts, sourcePlaceId)
  const [sourceAccountId, setSourceAccount] = useState(sourceAccounts[0]?.id ?? '')
  const sourceCash = state.holdings.filter((h: any) => !h.archived && h.kind === 'cash' && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
  const [sourceHoldingId, setSourceHolding] = useState(sourceCash[0]?.id ?? '')
  const [amountPaid, setAmountPaid] = useState('')

  const [targetPlaceId, setTargetPlace] = useState(places[0]?.id ?? '')
  const targetAccounts = activeAccounts(accounts, targetPlaceId).filter(a => a.kind !== 'credit_card')
  const [targetAccountId, setTargetAccount] = useState(targetAccounts[0]?.id ?? '')

  const [assetTypeId, setAssetType] = useState<AssetTypeId>('gold')
  const definition = assetTypeById(assetTypeId)!
  const [name, setName] = useState(definition.label)
  const [symbol, setSymbol] = useState(definition.defaultSymbol ?? '')
  const [quantity, setQuantity] = useState('')
  const [portfolioId, setPortfolio] = useState('')
  const [location, setLocation] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [extraCosts, setExtraCosts] = useState('0')
  const [quote, setQuote] = useState<MarketQuote | null>(null)
  const [quoteState, setQuoteState] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle')

  useEffect(() => {
    const next = assetTypeById(assetTypeId)!
    if (next.defaultSymbol) setSymbol(next.defaultSymbol)
    if (assetTypeId === 'gold' || assetTypeId === 'silver') setName(next.label)
    setQuote(null)
  }, [assetTypeId])

  useEffect(() => {
    if (!definition || !symbol.trim() || ['none', 'manual_appraisal', 'contractual'].includes(definition.quoteStrategy)) { setQuote(null); setQuoteState('fallback'); return }
    let alive = true
    setQuoteState('loading')
    const timer = window.setTimeout(async () => {
      const result = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy })
      if (!alive) return
      setQuote(result)
      setQuoteState(result ? 'live' : 'fallback')
    }, 450)
    return () => { alive = false; window.clearTimeout(timer) }
  }, [assetTypeId, symbol, definition.quoteStrategy])

  const source = state.holdings.find((h: any) => h.id === sourceHoldingId)
  const input: SimplifiedPurchaseInput = {
    sourceHoldingId, ownerId: SELF_ID, amountPaid: num(amountPaid || '0'), targetAccountId, assetTypeId,
    name: name.trim() || definition.label, symbol: symbol.trim() || definition.defaultSymbol, quantity: num(quantity || '0'),
    extraCostsSar: num(extraCosts || '0'), portfolioId: portfolioId || undefined, location: location || undefined, marketQuote: quote,
  }
  let preview: ReturnType<typeof previewSimplifiedPurchase> | null = null
  try { preview = previewSimplifiedPurchase(state, input) } catch { preview = null }

  const changeSourcePlace = (placeId: string) => {
    setSourcePlace(placeId)
    const account = activeAccounts(accounts, placeId)[0]
    setSourceAccount(account?.id ?? '')
    const holding = state.holdings.find((h: any) => h.kind === 'cash' && h.accountId === account?.id && ownerQuantity(h, SELF_ID) > 0)
    setSourceHolding(holding?.id ?? '')
  }
  const changeSourceAccount = (accountId: string) => {
    setSourceAccount(accountId)
    const holding = state.holdings.find((h: any) => h.kind === 'cash' && h.accountId === accountId && ownerQuantity(h, SELF_ID) > 0)
    setSourceHolding(holding?.id ?? '')
  }
  const changeTargetPlace = (placeId: string) => { setTargetPlace(placeId); setTargetAccount(activeAccounts(accounts, placeId).find(a => a.kind !== 'credit_card')?.id ?? '') }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    let finalQuote = quote
    if (!finalQuote && !['none', 'manual_appraisal', 'contractual'].includes(definition.quoteStrategy) && symbol.trim()) {
      setQuoteState('loading')
      finalQuote = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy })
      setQuote(finalQuote)
      setQuoteState(finalQuote ? 'live' : 'fallback')
    }
    await onSubmit({ ...input, marketQuote: finalQuote })
  }

  if (places.length === 0) return <EmptyAction title="لا يوجد مكان للحفظ بعد" text="أضف أولًا «مصرف الراجحي» أو «المنزل» من تبويب الأماكن والجهات، ثم أنشئ حسابًا تحته." />
  if (accounts.length === 0) return <EmptyAction title="لا توجد حسابات بعد" text="أنشئ حسابًا تحت المكان الذي أضفته، ثم أضف له رصيدًا قبل الشراء." />

  return <FormShell title="شراء أصل" subtitle="لا تدخل نوع الأصل أو سعر السوق يدويًا. اختر النوع من الدليل، أدخل ما دفعته وما استلمته، والنظام يحسب Cost Basis ويحاول جلب التقييم.">
    <form className="trade-form" onSubmit={submit}>
      <div className="divider">من أين دفعت؟</div>
      <div className="field-grid"><Field label="المكان / البنك"><select value={sourcePlaceId} onChange={e => changeSourcePlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب"><select value={sourceAccountId} onChange={e => changeSourceAccount(e.target.value)}>{activeAccounts(accounts, sourcePlaceId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
      <Field label="الرصيد المستخدم"><select value={sourceHoldingId} onChange={e => setSourceHolding(e.target.value)}><option value="">اختر الرصيد</option>{sourceCash.map((h: any) => <option key={h.id} value={h.id}>{h.symbol} — متاح {ownerQuantity(h, SELF_ID).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field>
      <div className="field-grid"><Field label={`المبلغ المدفوع${source ? ` (${source.nativeUnit})` : ''}`}><input value={amountPaid} onChange={e => setAmountPaid(e.target.value)} inputMode="decimal" placeholder="مثال: 5400" /></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">من السيولة الحرة</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>

      <div className="divider">ماذا اشتريت؟</div>
      <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setAssetType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(item => <option key={item.id} value={item.id}>{item.groupLabel} — {item.label}</option>)}</select><small>{definition.helper}</small></Field>
      <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder={definition.label} /></Field>{definition.requiresInstrumentIdentity || definition.defaultSymbol ? <Field label="الرمز / Ticker"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder={definition.defaultSymbol || 'XRP / 2222 / FUND'} /></Field> : <div />}</div>
      <div className="field-grid"><Field label={`الكمية المستلمة (${definition.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" placeholder="مثال: 10" /></Field><Field label="المكان الجغرافي (للأصل المادي، اختياري)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="حلب / الرياض..." /></Field></div>

      <div className="divider">أين سيُحفظ الأصل؟</div>
      <div className="field-grid"><Field label="المكان / الجهة"><select value={targetPlaceId} onChange={e => changeTargetPlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب / الحاوية"><select value={targetAccountId} onChange={e => setTargetAccount(e.target.value)}><option value="">اختر الحساب</option>{targetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>

      <button className="ghost advanced-toggle" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'إخفاء التفاصيل المتقدمة' : 'تفاصيل متقدمة: رسوم/تكاليف إضافية'}</button>
      {showAdvanced && <Field label="تكاليف إضافية كلية بالريال"><input value={extraCosts} onChange={e => setExtraCosts(e.target.value)} inputMode="decimal" placeholder="0" /><small>اختياري. لا تدخل spread مضمنًا مرة ثانية إذا كان المبلغ المدفوع يعكسه أصلًا.</small></Field>}

      <div className="purchase-summary">
        <Summary label="Cost Basis الكلي" value={preview ? `${money.format(preview.totalCostBasisSar)} ر.س` : '—'} />
        <Summary label={`التكلفة الفعلية / ${definition.defaultUnit}`} value={preview ? `${money.format(preview.effectiveUnitCostSar)} ر.س` : '—'} />
        <Summary label="التقييم السوقي" value={quoteState === 'loading' ? 'جاري جلب السعر…' : quote ? `${money.format(quote.unitPriceSar)} ر.س` : 'سيبدأ مؤقتًا من تكلفة الشراء'} />
        {preview?.unrealizedAtPurchaseSar != null && <Summary label="غير محقق الآن" value={`${preview.unrealizedAtPurchaseSar >= 0 ? '+' : ''}${money.format(preview.unrealizedAtPurchaseSar)} ر.س`} />}
      </div>
      <div className={`quote-status ${quote ? 'live' : 'fallback'}`}>{quote ? `سعر السوق: ${quote.source} • ${new Date(quote.asOf).toLocaleString('ar-SA')}` : definition.quoteStrategy === 'manual_appraisal' ? 'هذا أصل يحتاج تقييمًا/تثمينًا دوريًا؛ لا يوجد سعر شاشة موحد.' : definition.quoteStrategy === 'contractual' ? 'القيمة تعاقدية وليست سعر تداول لحظيًا.' : 'مزود السعر غير متاح الآن؛ لن نطلب منك اختراع سعر سوق عند الشراء.'}</div>
      <div className="operation-rule"><span>الربح/الخسارة = القيمة الحالية − التكلفة التاريخية. يظهر غير محقق أثناء الاحتفاظ، ويصبح محققًا فقط عند بيع/تسييل الأصل فعليًا.</span></div>
      <button className="primary wide" type="submit" disabled={!preview || !targetAccountId}>تأكيد شراء الأصل</button>
    </form>
  </FormShell>
}

function AccountForm({ places, onSubmit }: { places: Party[]; onSubmit: (input: AddAccountInput) => void }) {
  const [placeId, setPlace] = useState(places[0]?.id ?? '')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('checking')
  const [currency, setCurrency] = useState('SAR')
  const [last4, setLast4] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, kind, custodianId: placeId, currency: currency || undefined, last4: last4 || undefined }); setName(''); setLast4('') }
  if (!places.length) return <EmptyAction title="أضف المكان أولًا" text="الحساب لا يوجد منفردًا؛ أنشئ مصرفًا أو منزلًا أو منصة ثم أضف الحساب تحته." />
  return <FormShell title="إضافة حساب تحت مكان" subtitle="مثال: مصرف الراجحي ← جاري شخصي / بطاقة / حساب استثماري. الحساب يجيب «أين داخل هذا المكان؟»."><form className="trade-form" onSubmit={submit}>
    <Field label="المكان / البنك"><select value={placeId} onChange={e => setPlace(e.target.value)}>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <div className="field-grid"><Field label="اسم الحساب"><input value={name} onChange={e => setName(e.target.value)} placeholder="جاري شخصي / بطاقة سفر / محفظة أسهم" /></Field><Field label="نوع الحساب"><select value={kind} onChange={e => setKind(e.target.value as AccountKind)}>{accountKinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="العملة الأساسية"><input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} /></Field><Field label="آخر 4 أرقام (اختياري)"><input value={last4} onChange={e => setLast4(e.target.value)} maxLength={4} /></Field></div>
    <button className="primary wide" type="submit">إضافة الحساب</button>
  </form></FormShell>
}

function FundsForm({ owners, places, accounts, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [placeId, setPlace] = useState(places[0]?.id ?? '')
  const placeAccounts = activeAccounts(accounts, placeId).filter(a => a.kind !== 'credit_card')
  const [accountId, setAccount] = useState(placeAccounts[0]?.id ?? '')
  const [symbol, setSymbol] = useState('SAR'); const [quantity, setQuantity] = useState(''); const [unitCost, setUnitCost] = useState('1'); const [market, setMarket] = useState('1'); const [classification, setClass] = useState<'opening' | 'income'>('opening'); const [portfolioId, setPortfolio] = useState('')
  const changePlace = (id: string) => { setPlace(id); setAccount(activeAccounts(accounts, id).find(a => a.kind !== 'credit_card')?.id ?? '') }
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ accountId, ownerId, symbol, nativeUnit: symbol, quantity: num(quantity), unitCostSar: symbol === 'SAR' ? 1 : num(unitCost), marketPriceSar: symbol === 'SAR' ? 1 : num(market), classification, portfolioId: portfolioId || undefined }) }
  if (!places.length || !accounts.length) return <EmptyAction title="أنشئ مكانًا وحسابًا أولًا" text="الرصيد يجب أن يوجد داخل حساب تابع لمكان واضح." />
  return <FormShell title="إضافة رصيد" subtitle="اختر المكان ثم الحساب. الرصيد الافتتاحي ليس دخلًا؛ الدخل الجديد يُسجل كتدفق."><form className="trade-form" onSubmit={submit}>
    <div className="field-grid"><Field label="المكان"><select value={placeId} onChange={e => changePlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب"><select value={accountId} onChange={e => setAccount(e.target.value)}>{placeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <div className="field-grid three"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="العملة"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} /></Field><Field label="المبلغ"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field></div>
    {symbol !== 'SAR' && <div className="field-grid"><Field label="تكلفة الوحدة بالريال"><input value={unitCost} onChange={e => setUnitCost(e.target.value)} inputMode="decimal" /></Field><Field label="القيمة الحالية للوحدة"><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" /></Field></div>}
    <div className="field-grid"><Field label="التصنيف"><select value={classification} onChange={e => setClass(e.target.value as 'opening' | 'income')}><option value="opening">رصيد قائم / افتتاحي</option><option value="income">دخل جديد</option></select></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <button className="primary wide" type="submit">إضافة الرصيد</button>
  </form></FormShell>
}

function ExistingAssetForm({ owners, places, accounts, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [placeId, setPlace] = useState(places[0]?.id ?? '')
  const placeAccounts = activeAccounts(accounts, placeId).filter(a => a.kind !== 'credit_card')
  const [accountId, setAccount] = useState(placeAccounts[0]?.id ?? '')
  const [assetTypeId, setType] = useState<AssetTypeId>('vehicle')
  const def = assetTypeById(assetTypeId)!
  const [name, setName] = useState(''); const [symbol, setSymbol] = useState(''); const [quantity, setQuantity] = useState('1'); const [cost, setCost] = useState(''); const [current, setCurrent] = useState(''); const [portfolioId, setPortfolio] = useState(''); const [location, setLocation] = useState('')
  const changePlace = (id: string) => { setPlace(id); setAccount(activeAccounts(accounts, id).find(a => a.kind !== 'credit_card')?.id ?? '') }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const totalCost = cost.trim() ? num(cost) : undefined
    const currentUnit = current.trim() ? num(current) : totalCost != null ? totalCost / Math.max(num(quantity), 1) : 1
    onSubmit({ ownerId, accountId, name: name || def.label, symbol: symbol || def.defaultSymbol || name.slice(0, 5), kind: def.kind, nativeUnit: def.defaultUnit, quantity: num(quantity), costBasisSar: totalCost, marketPriceSar: currentUnit, performanceRole: defaultPerformanceRoleForKind(def.kind), portfolioId: portfolioId || undefined, location: location || undefined })
  }
  if (!places.length || !accounts.length) return <EmptyAction title="أنشئ مكانًا وحسابًا أولًا" text="حتى الأصل القائم يجب أن نعرف أين يوجد فعليًا." />
  return <FormShell title="تسجيل أصل تملكه مسبقًا" subtitle="لا ننشئ دفعة تاريخية وهمية. اختر نوع الأصل من الدليل، مكانه، وما تعرفه من التكلفة والتقييم."><form className="trade-form" onSubmit={submit}>
    <div className="field-grid"><Field label="المكان"><select value={placeId} onChange={e => changePlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب / الحاوية"><select value={accountId} onChange={e => setAccount(e.target.value)}>{placeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(item => <option key={item.id} value={item.id}>{item.groupLabel} — {item.label}</option>)}</select></Field>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder={def.label} /></Field><Field label="الرمز (إن وجد)"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder={def.defaultSymbol || ''} /></Field></div>
    <div className="field-grid three"><Field label={`الكمية (${def.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="إجمالي التكلفة التاريخية"><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="اختياري" /></Field><Field label="القيمة الحالية للوحدة"><input value={current} onChange={e => setCurrent(e.target.value)} inputMode="decimal" placeholder="اختياري للأصول غير المسعرة" /></Field></div>
    <div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="الموقع الجغرافي (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="مثال: حلب" /></Field>
    <button className="primary wide" type="submit">تسجيل الأصل</button>
  </form></FormShell>
}

function TransferForm({ state, places, accounts, onSubmit }: any) {
  const [sourcePlaceId, setSourcePlace] = useState(places[0]?.id ?? '')
  const [sourceAccountId, setSourceAccount] = useState(activeAccounts(accounts, sourcePlaceId)[0]?.id ?? '')
  const sourceHoldings = state.holdings.filter((h: any) => h.kind === 'cash' && !h.archived && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
  const [holdingId, setHolding] = useState(sourceHoldings[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [targetPlaceId, setTargetPlace] = useState(places[0]?.id ?? '')
  const [targetAccountId, setTargetAccount] = useState(activeAccounts(accounts, targetPlaceId)[0]?.id ?? '')
  const changeSourcePlace = (id: string) => { setSourcePlace(id); const account = activeAccounts(accounts, id)[0]; setSourceAccount(account?.id ?? ''); setHolding(state.holdings.find((h: any) => h.kind === 'cash' && h.accountId === account?.id)?.id ?? '') }
  const changeSourceAccount = (id: string) => { setSourceAccount(id); setHolding(state.holdings.find((h: any) => h.kind === 'cash' && h.accountId === id)?.id ?? '') }
  const changeTargetPlace = (id: string) => { setTargetPlace(id); setTargetAccount(activeAccounts(accounts, id)[0]?.id ?? '') }
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ sourceHoldingId: holdingId, ownerId: SELF_ID, quantity: num(quantity), targetAccountId }) }
  return <FormShell title="نقل أموال" subtitle="نفس العملة تنتقل من حساب إلى حساب. لا دخل ولا مصروف ولا P/L."><form className="trade-form" onSubmit={submit}>
    <div className="divider">من</div><div className="field-grid"><Field label="المكان"><select value={sourcePlaceId} onChange={e => changeSourcePlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب"><select value={sourceAccountId} onChange={e => changeSourceAccount(e.target.value)}>{activeAccounts(accounts, sourcePlaceId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="الرصيد"><select value={holdingId} onChange={e => setHolding(e.target.value)}>{sourceHoldings.map((h: any) => <option key={h.id} value={h.id}>{h.symbol} — {ownerQuantity(h, SELF_ID).toLocaleString('ar-SA')}</option>)}</select></Field><Field label="المبلغ"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field></div>
    <div className="divider">إلى</div><div className="field-grid"><Field label="المكان"><select value={targetPlaceId} onChange={e => changeTargetPlace(e.target.value)}>{places.map((p: Party) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="الحساب"><select value={targetAccountId} onChange={e => setTargetAccount(e.target.value)}>{activeAccounts(accounts, targetPlaceId).filter(a => a.id !== sourceAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <button className="primary wide" type="submit">نقل الأموال</button>
  </form></FormShell>
}

function PortfolioForm({ owners, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [name, setName] = useState(''); const [profile, setProfile] = useState<PortfolioProfile>('investment'); const [parentId, setParent] = useState(''); const [purpose, setPurpose] = useState(''); const [target, setTarget] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, ownerId, parentId: parentId || undefined, profile, purpose: purpose || undefined, targetValueSar: target.trim() ? num(target) : undefined, protectionMode: 'flexible' }); setName('') }
  return <FormShell title="إنشاء محفظة" subtitle="المحفظة WHY وليست مكانًا ولا حسابًا."><form className="trade-form" onSubmit={submit}><div className="field-grid"><Field label="اسم المحفظة"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div><div className="field-grid"><Field label="السلوك"><select value={profile} onChange={e => setProfile(e.target.value as PortfolioProfile)}>{profiles.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="محفظة أم"><select value={parentId} onChange={e => setParent(e.target.value)}><option value="">جذرية</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><Field label="الغرض"><input value={purpose} onChange={e => setPurpose(e.target.value)} /></Field><Field label="الهدف بالريال"><input value={target} onChange={e => setTarget(e.target.value)} inputMode="decimal" /></Field><button className="primary wide" type="submit">إنشاء المحفظة</button></form></FormShell>
}

function AllocateForm({ state, owners, holdings, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const eligible = useMemo(() => holdings.filter((h: any) => ownerQuantity(h, ownerId) > 0), [holdings, ownerId])
  const [holdingId, setHolding] = useState(eligible[0]?.id ?? '')
  const [portfolioId, setPortfolio] = useState(portfolios[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const holding = eligible.find((h: any) => h.id === holdingId)
  const free = holding ? availableQuantity(state, holding.id, ownerId) : 0
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ holdingId, ownerId, portfolioId, quantity: num(quantity) }) }
  return <FormShell title="تخصيص لمحفظة" subtitle="تغيير الغرض فقط؛ الأصل يبقى في مكانه وحسابه."><form className="trade-form" onSubmit={submit}><Field label="المالك"><select value={ownerId} onChange={e => { setOwner(e.target.value); setHolding('') }}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="الأصل"><select value={holdingId} onChange={e => setHolding(e.target.value)}><option value="">اختر الأصل</option>{eligible.map((h: any) => <option key={h.id} value={h.id}>{h.name} — حر {availableQuantity(state, h.id, ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field><div className="field-grid"><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /><small>المتاح: {free.toLocaleString('ar-SA')} {holding?.nativeUnit}</small></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><button className="primary wide" type="submit">تخصيص</button></form></FormShell>
}

function FormShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="panel operation-form"><div className="panel-head"><div><span>تنفيذ على بياناتك</span><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span>{label}</span>{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div className="purchase-summary-item"><span>{label}</span><strong>{value}</strong></div> }
function EmptyAction({ title, text }: { title: string; text: string }) { return <div className="panel empty-preview"><Landmark /><strong>{title}</strong><span>{text}</span></div> }

function helpFor(action: ActionKey) {
  return ({
    purchase: 'حدد البنك/المكان والحساب الذي دفعت منه، ثم نوع الأصل من الدليل، وما دفعته وما استلمته. السعر السوقي ليس حقل إدخال عاديًا.',
    transfer: 'المكان والحساب يتغيران، لكن الأصل نفسه لا يتحول إلى دخل أو ربح.',
    funds: 'كل رصيد يجب أن يسكن داخل حساب واضح تحت مكان واضح.',
    existing: 'الأصل القديم يسجل حيث يوجد الآن، بلا اختراع حركة شراء حالية.',
    portfolio: 'المحفظة غرض اقتصادي يمكن أن يمتد عبر أماكن وحسابات متعددة.',
    allocate: 'التخصيص يجيب لماذا، ولا يغير أين يوجد الأصل.',
    account: 'أنشئ عدة حسابات وبطاقات وحاويات تحت مصرف أو منزل أو منصة واحدة.',
  } as Record<ActionKey, string>)[action]
}
