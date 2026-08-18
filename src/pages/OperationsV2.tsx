import { ArrowLeftRight, BanknoteArrowDown, Boxes, CirclePlus, FolderPlus, PackagePlus, ShoppingCart, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { AddFundsInput, AllocateToPortfolioInput, CreatePortfolioInput, ExistingAssetInput, TransferFundsInput } from '../application/commands'
import type { CreateGroupedAccountInput } from '../application/accountGroups'
import { previewSimplifiedPurchase, type SimplifiedPurchaseInput } from '../application/purchase'
import { AccountCascader } from '../components/AccountCascader'
import { useToast } from '../components/ToastProvider'
import { assetTypeById, assetTypeCatalog, defaultPerformanceRoleForKind, type AssetTypeId } from '../domain/assetCatalog'
import { currencyByCode, currencyCatalog, currencyReferenceRateSar } from '../domain/currencies'
import { availableQuantity, ownerQuantity } from '../domain/finance'
import type { Account, AccountKind, FinanceState, Holding, Party, Portfolio, PortfolioProfile } from '../domain/types'
import { fetchMarketQuote, type MarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
type ActionKey = 'purchase' | 'transfer' | 'funds' | 'existing' | 'portfolio' | 'allocate' | 'account'

const actions: { id: ActionKey; title: string; sub: string; icon: typeof ShoppingCart }[] = [
  { id: 'purchase', title: 'شراء أصل', sub: 'حساب دفع ← أصل ← حساب حفظ', icon: ShoppingCart },
  { id: 'transfer', title: 'نقل أموال', sub: 'حساب إلى حساب بدون P/L', icon: ArrowLeftRight },
  { id: 'funds', title: 'إضافة أموال', sub: 'رصيد افتتاحي واحد أو دخل متكرر', icon: BanknoteArrowDown },
  { id: 'existing', title: 'إضافة أصل قائم', sub: 'بدون دفع وهمي', icon: PackagePlus },
  { id: 'portfolio', title: 'إنشاء محفظة', sub: 'غرض وهدف وسلوك', icon: FolderPlus },
  { id: 'allocate', title: 'تخصيص لمحفظة', sub: 'تغيير الغرض فقط', icon: Boxes },
  { id: 'account', title: 'إضافة حساب', sub: 'وعاء حقيقي للأصول', icon: WalletCards },
]

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'checking', label: 'حساب جاري' },
  { value: 'saving', label: 'حساب ادخار' },
  { value: 'investment', label: 'حساب استثماري' },
  { value: 'cash_container', label: 'خزنة / نقد فعلي' },
  { value: 'custody', label: 'حفظ أصول' },
  { value: 'fixed_term', label: 'استثمار لأجل' },
  { value: 'prepaid', label: 'مسبق الدفع' },
  { value: 'credit_card', label: 'بطاقة ائتمان' },
]

const profiles: { value: PortfolioProfile; label: string }[] = [
  { value: 'investment', label: 'استثمار' },
  { value: 'savings_goal', label: 'ادخار / هدف' },
  { value: 'reserve', label: 'احتياطي' },
  { value: 'commitment', label: 'التزام' },
  { value: 'spending_budget', label: 'ميزانية مصروف' },
  { value: 'deal', label: 'عملية / صفقة' },
]

function num(value: string) { return Number(value.replace(/,/g, '')) }
function err(error: unknown) { return error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }
function activeAccounts(accounts: Account[]) { return accounts.filter(a => a.status === 'active') }

export function OperationsV2({ goTrade }: { goTrade: () => void }) {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const accounts = activeAccounts(state.accounts)
  const portfolios = state.portfolios.filter(p => p.status === 'active')
  const holdings = state.holdings.filter(h => !h.archived && h.quantity > 0)
  const [action, setAction] = useState<ActionKey>('purchase')

  const execute = (fn: () => void, success: string) => {
    try { fn(); toast.success(success); return true } catch (error) { toast.error(err(error)); return false }
  }

  return <div className="page-stack operations-page">
    <section className="section-intro operations-intro">
      <div><span className="eyebrow">GROUP → ACCOUNT → HOLDING</span><h2>العمليات المالية</h2><p>الحساب هو الوعاء الحقيقي الذي يحتوي الأصول. المجموعة اختيارية لتنظيم الحسابات بالطريقة التي تناسبك، ولا تمثل مكانًا أو أصلًا أو حركة مالية.</p></div>
      <button className="secondary operations-convert" onClick={goTrade}><ArrowLeftRight size={17}/> تحويل / تسييل أصل</button>
    </section>

    <section className="action-picker">
      {actions.map(item => { const Icon = item.icon; return <button key={item.id} className={action === item.id ? 'action-choice active' : 'action-choice'} onClick={() => setAction(item.id)}><Icon size={18}/><span><strong>{item.title}</strong><small>{item.sub}</small></span></button> })}
    </section>

    <section className="operation-workspace">
      <div className="operation-form-panel">
        {action === 'purchase' && <PurchaseForm state={state} accounts={accounts} portfolios={portfolios} onSubmit={(input: SimplifiedPurchaseInput) => execute(() => finance.purchaseAsset(input), `تم شراء «${input.name}» بنجاح وتحديث الرصيد والتكلفة.`)}/>} 
        {action === 'transfer' && <TransferForm state={state} accounts={accounts} onSubmit={(input: TransferFundsInput) => execute(() => finance.transferFunds(input), 'تم نقل الأموال بين الحسابات بدون تسجيل ربح أو خسارة.')}/>} 
        {action === 'funds' && <FundsForm key={`funds-${state.ledger.length}-${state.ledger.reduce((sum, tx) => sum + tx.version, 0)}`} state={state} owners={owners} accounts={accounts} portfolios={portfolios} onSubmit={(input: AddFundsInput) => execute(() => finance.addFunds(input), input.classification === 'opening' ? 'تم حفظ الرصيد الافتتاحي. هذا الرصيد يسجل مرة واحدة فقط وأي حفظ لاحق يعدّل نفس الرصيد.' : 'تمت إضافة الدخل بنجاح.')}/>} 
        {action === 'existing' && <ExistingAssetForm state={state} owners={owners} accounts={accounts} portfolios={portfolios} onSubmit={(input: ExistingAssetInput) => execute(() => finance.addExistingAsset(input), 'تم تسجيل الأصل القائم بنجاح دون خصم وهمي.')}/>} 
        {action === 'portfolio' && <PortfolioForm owners={owners} portfolios={portfolios} onSubmit={(input: CreatePortfolioInput) => execute(() => finance.createPortfolio(input), 'تم إنشاء المحفظة بنجاح.')}/>} 
        {action === 'allocate' && <AllocateForm state={state} owners={owners} holdings={holdings} portfolios={portfolios} onSubmit={(input: AllocateToPortfolioInput) => execute(() => finance.allocateToPortfolio(input), 'تم تخصيص الأصل للمحفظة بدون حركة نقدية.')}/>} 
        {action === 'account' && <AccountForm state={state} onSubmit={(input: CreateGroupedAccountInput) => execute(() => finance.addAccount(input), 'تم إنشاء الحساب بنجاح. يمكنك الآن إضافة أرصدة أو أصول داخله.')}/>} 
      </div>
      <aside className="operation-help"><WalletCards size={20}/><strong>قاعدة بسيطة</strong><p>{helpFor(action)}</p><div className="operation-rule"><CirclePlus size={15}/><span>المجموعة تنظّم العرض فقط. الحساب هو الوعاء؛ والأرصدة والأصول هي القيمة الفعلية.</span></div></aside>
    </section>
  </div>
}

type PurchaseProps = { state: FinanceState; accounts: Account[]; portfolios: Portfolio[]; onSubmit: (input: SimplifiedPurchaseInput) => void }
function PurchaseForm({ state, accounts, portfolios, onSubmit }: PurchaseProps) {
  const paymentAccounts = accounts.filter(a => a.kind !== 'credit_card' && state.holdings.some(h => !h.archived && h.kind === 'cash' && h.accountId === a.id && ownerQuantity(h, SELF_ID) > 0))
  const [sourceAccountId, setSourceAccount] = useState('')
  const sourceCash = state.holdings.filter(h => !h.archived && h.kind === 'cash' && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
  const [sourceHoldingId, setSourceHolding] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const targetAccounts = accounts.filter(a => a.kind !== 'credit_card')
  const [targetAccountId, setTargetAccount] = useState('')
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
    setSymbol(next.defaultSymbol ?? '')
    if (assetTypeId === 'gold' || assetTypeId === 'silver') setName(next.label)
    setQuote(null)
  }, [assetTypeId])

  useEffect(() => {
    const first = state.holdings.find(h => !h.archived && h.kind === 'cash' && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
    setSourceHolding(first?.id ?? '')
  }, [sourceAccountId, state.holdings])

  useEffect(() => {
    if (!symbol.trim() || ['none', 'manual_appraisal', 'contractual'].includes(definition.quoteStrategy)) { setQuote(null); setQuoteState('fallback'); return }
    let active = true
    setQuoteState('loading')
    const timer = window.setTimeout(async () => {
      const result = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy })
      if (!active) return
      setQuote(result); setQuoteState(result ? 'live' : 'fallback')
    }, 450)
    return () => { active = false; window.clearTimeout(timer) }
  }, [assetTypeId, symbol, definition.quoteStrategy])

  const source = state.holdings.find(h => h.id === sourceHoldingId)
  const input: SimplifiedPurchaseInput = {
    sourceHoldingId, ownerId: SELF_ID, amountPaid: num(amountPaid || '0'), targetAccountId, assetTypeId,
    name: name.trim() || definition.label, symbol: symbol.trim() || definition.defaultSymbol, quantity: num(quantity || '0'),
    extraCostsSar: num(extraCosts || '0'), portfolioId: portfolioId || undefined, location: location || undefined, marketQuote: quote,
  }
  let preview: ReturnType<typeof previewSimplifiedPurchase> | null = null
  try { preview = previewSimplifiedPurchase(state, input) } catch { preview = null }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    let finalQuote = quote
    if (!finalQuote && !['none', 'manual_appraisal', 'contractual'].includes(definition.quoteStrategy) && symbol.trim()) {
      setQuoteState('loading')
      finalQuote = await fetchMarketQuote({ assetTypeId, symbol, quoteStrategy: definition.quoteStrategy })
      setQuote(finalQuote); setQuoteState(finalQuote ? 'live' : 'fallback')
    }
    onSubmit({ ...input, marketQuote: finalQuote })
  }

  if (!accounts.length) return <EmptyAction title="لا توجد حسابات بعد" text="أنشئ حسابًا أولًا؛ المجموعة اختيارية وليست شرطًا." />
  if (!paymentAccounts.length) return <EmptyAction title="لا يوجد رصيد صالح للدفع" text="أضف رصيدًا نقديًا إلى أحد الحسابات أولًا." />

  return <FormShell title="شراء أصل" subtitle="اختر الحساب عبر شجرتك: مجموعة ← مجموعة فرعية ← حساب. لا يوجد اختيار تلقائي لحساب عشوائي."><form className="trade-form" onSubmit={submit}>
    <div className="divider">من أين دفعت؟</div>
    <AccountCascader state={state} accounts={paymentAccounts} value={sourceAccountId} onChange={setSourceAccount} label="حساب الدفع" helper="تظهر كل المجموعات النشطة؛ الحسابات غير الصالحة للدفع لا تكون عقدًا نهائية قابلة للاختيار." />
    <Field label="الرصيد المستخدم"><select value={sourceHoldingId} onChange={e => setSourceHolding(e.target.value)}><option value="">اختر الرصيد</option>{sourceCash.map(h => <option key={h.id} value={h.id}>{h.symbol} — متاح {ownerQuantity(h, SELF_ID).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field>
    <div className="field-grid"><Field label={`المبلغ المدفوع${source ? ` (${source.nativeUnit})` : ''}`}><input value={amountPaid} onChange={e => setAmountPaid(e.target.value)} inputMode="decimal" placeholder="مثال: 5400" /></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">من السيولة الحرة</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>

    <div className="divider">ماذا اشتريت؟</div>
    <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setAssetType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(item => <option key={item.id} value={item.id}>{item.groupLabel} — {item.label}</option>)}</select><small>{definition.helper}</small></Field>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder={definition.label} /></Field>{definition.requiresInstrumentIdentity || definition.defaultSymbol ? <Field label="الرمز / Ticker"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder={definition.defaultSymbol || 'XRP / 2222 / FUND'} /></Field> : <div/>}</div>
    <div className="field-grid"><Field label={`الكمية المستلمة (${definition.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="الموقع الجغرافي للأصل المادي (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="حلب / الرياض..." /></Field></div>

    <div className="divider">في أي حساب سيُحفظ الأصل؟</div>
    <AccountCascader state={state} accounts={targetAccounts} value={targetAccountId} onChange={setTargetAccount} label="حساب الحفظ" />

    <button className="ghost advanced-toggle" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'إخفاء التفاصيل المتقدمة' : 'تفاصيل متقدمة: رسوم/تكاليف إضافية'}</button>
    {showAdvanced && <Field label="تكاليف إضافية كلية بالريال"><input value={extraCosts} onChange={e => setExtraCosts(e.target.value)} inputMode="decimal" placeholder="0" /><small>لا تدخل spread مضمنًا مرة ثانية إذا كان المبلغ المدفوع يعكسه أصلًا.</small></Field>}

    <div className="purchase-summary"><Summary label="Cost Basis الكلي" value={preview ? `${money.format(preview.totalCostBasisSar)} ر.س` : '—'}/><Summary label={`التكلفة الفعلية / ${definition.defaultUnit}`} value={preview ? `${money.format(preview.effectiveUnitCostSar)} ر.س` : '—'}/><Summary label="التقييم السوقي" value={quoteState === 'loading' ? 'جاري جلب السعر…' : quote ? `${money.format(quote.unitPriceSar)} ر.س` : 'سيبدأ مؤقتًا من تكلفة الشراء'}/>{preview?.unrealizedAtPurchaseSar != null && <Summary label="غير محقق الآن" value={`${preview.unrealizedAtPurchaseSar >= 0 ? '+' : ''}${money.format(preview.unrealizedAtPurchaseSar)} ر.س`}/>}</div>
    <div className={`quote-status ${quote ? 'live' : 'fallback'}`}>{quote ? `سعر السوق: ${quote.source} • ${new Date(quote.asOf).toLocaleString('ar-SA')}` : definition.quoteStrategy === 'manual_appraisal' ? 'هذا أصل يحتاج تقييمًا دوريًا.' : definition.quoteStrategy === 'contractual' ? 'القيمة تعاقدية وليست سعر تداول لحظيًا.' : 'مزود السعر غير متاح الآن؛ لن نطلب منك اختراع سعر سوق.'}</div>
    <div className="operation-rule"><span>الربح/الخسارة = القيمة الحالية − التكلفة التاريخية؛ تبقى غير محققة حتى البيع أو التسييل الحقيقي إلى نقد.</span></div>
    <button className="primary wide" type="submit" disabled={!preview || !targetAccountId}>تأكيد شراء الأصل</button>
  </form></FormShell>
}

function AccountForm({ state, onSubmit }: { state: FinanceState; onSubmit: (input: CreateGroupedAccountInput) => void }) {
  const groups = (state.accountGroups ?? []).filter(g => g.status === 'active')
  const [groupId, setGroup] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('checking')
  const [currency, setCurrency] = useState('SAR')
  const [last4, setLast4] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, kind, groupId: groupId || undefined, currency: currency || undefined, last4: last4 || undefined }); setName(''); setLast4('') }
  return <FormShell title="إضافة حساب" subtitle="الحساب هو الوعاء الحاوي للأصول. ضعه في مجموعة إن أردت، أو اتركه بلا مجموعة."><form className="trade-form" onSubmit={submit}>
    <Field label="المجموعة (اختياري)"><select value={groupId} onChange={e => setGroup(e.target.value)}><option value="">بدون مجموعة</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><small>المجموعة تنظيم بصري فقط ويمكن تغييرها لاحقًا.</small></Field>
    <div className="field-grid"><Field label="اسم الحساب"><input value={name} onChange={e => setName(e.target.value)} placeholder="الراجحي الجاري / خزنة المنزل / دراية" /></Field><Field label="نوع الحساب"><select value={kind} onChange={e => setKind(e.target.value as AccountKind)}>{accountKinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="العملة الأساسية"><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencyCatalog.map(item => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select></Field><Field label="آخر 4 أرقام (اختياري)"><input value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} /></Field></div>
    <button className="primary wide" type="submit">إضافة الحساب</button>
  </form></FormShell>
}

function FundsForm({ state, owners, accounts, portfolios, onSubmit }: { state: FinanceState; owners: Party[]; accounts: Account[]; portfolios: Portfolio[]; onSubmit: (input: AddFundsInput) => boolean }) {
  const eligible = accounts.filter(a => a.kind !== 'credit_card')
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [accountId, setAccount] = useState('')
  const [symbol, setSymbol] = useState('SAR')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('1')
  const [market, setMarket] = useState('1')
  const [classification, setClass] = useState<'opening' | 'income'>('opening')
  const [portfolioId, setPortfolio] = useState('')
  const fixedRate = currencyReferenceRateSar(symbol)
  const currency = currencyByCode(symbol)

  useEffect(() => {
    const account = eligible.find(a => a.id === accountId)
    const next = currencyByCode(account?.currency)?.code
    if (next) setSymbol(next)
  }, [accountId, eligible])

  useEffect(() => {
    const rate = currencyReferenceRateSar(symbol)
    if (rate != null) { setUnitCost(String(rate)); setMarket(String(rate)) }
  }, [symbol])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const unitCostSar = fixedRate ?? num(unitCost)
    const marketPriceSar = fixedRate ?? num(market)
    const ok = onSubmit({ accountId, ownerId, symbol, nativeUnit: symbol, quantity: num(quantity), unitCostSar, marketPriceSar, classification, portfolioId: portfolioId || undefined })
    if (ok) { setQuantity(''); setPortfolio(''); if (fixedRate == null) { setUnitCost(''); setMarket('') } }
  }
  if (!eligible.length) return <EmptyAction title="أنشئ حسابًا أولًا" text="الرصيد يجب أن يوجد داخل حساب. المجموعة ليست شرطًا." />
  return <FormShell title="إضافة رصيد" subtitle="أدخل الرصيد بعملته الأصلية. التطبيق يحتفظ بالكمية الأصلية ويحوّل قيمتها إلى عملة العرض في التجميع والتقارير."><form className="trade-form" onSubmit={submit}>
    <AccountCascader state={state} accounts={eligible} value={accountId} onChange={setAccount} label="الحساب" />
    <div className="field-grid three"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="العملة"><select value={symbol} onChange={e => setSymbol(e.target.value)}>{currencyCatalog.map(item => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select></Field><Field label={`المبلغ (${symbol})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field></div>
    {fixedRate != null ? <div className="operation-rule"><span>سعر التقييم المرجعي: 1 {symbol} = {money.format(fixedRate)} ر.س{currency?.referenceNote ? ` • ${currency.referenceNote}` : ''}. الكمية تبقى {symbol}؛ هذا السعر يستخدم فقط للتقييم والتجميع.</span></div> : symbol !== 'SAR' && <div className="field-grid"><Field label="تكلفة الوحدة بالريال"><input value={unitCost} onChange={e => setUnitCost(e.target.value)} inputMode="decimal" placeholder="مثال: سعر الاقتناء بالريال" /></Field><Field label="القيمة الحالية للوحدة بالريال"><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" placeholder="سعر الصرف الحالي إلى SAR" /></Field></div>}
    <div className="field-grid"><Field label="التصنيف"><select value={classification} onChange={e => setClass(e.target.value as 'opening' | 'income')}><option value="opening">رصيد قائم / افتتاحي — مرة واحدة</option><option value="income">دخل جديد — قابل للتكرار</option></select></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    {classification === 'opening' && <div className="operation-rule"><span>إذا كان هناك رصيد افتتاحي سابق لنفس الحساب والمالك والعملة، فلن نضيفه مرة ثانية؛ سيتم تعديل الرصيد الافتتاحي الموجود وتوحيد أي إدخالات مكررة قديمة.</span></div>}
    <button className="primary wide" type="submit" disabled={!accountId || !quantity.trim()}>{classification === 'opening' ? 'حفظ الرصيد الافتتاحي' : 'إضافة الدخل'}</button>
  </form></FormShell>
}

function ExistingAssetForm({ state, owners, accounts, portfolios, onSubmit }: { state: FinanceState; owners: Party[]; accounts: Account[]; portfolios: Portfolio[]; onSubmit: (input: ExistingAssetInput) => void }) {
  const eligible = accounts.filter(a => a.kind !== 'credit_card')
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [accountId, setAccount] = useState('')
  const [assetTypeId, setType] = useState<AssetTypeId>('vehicle')
  const def = assetTypeById(assetTypeId)!
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [cost, setCost] = useState('')
  const [current, setCurrent] = useState('')
  const [portfolioId, setPortfolio] = useState('')
  const [location, setLocation] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const totalCost = cost.trim() ? num(cost) : undefined
    const q = Math.max(num(quantity), 1)
    const currentUnit = current.trim() ? num(current) : totalCost != null ? totalCost / q : 1
    onSubmit({ ownerId, accountId, name: name || def.label, symbol: symbol || def.defaultSymbol || name.slice(0, 5), kind: def.kind, nativeUnit: def.defaultUnit, quantity: num(quantity), costBasisSar: totalCost, marketPriceSar: currentUnit, performanceRole: defaultPerformanceRoleForKind(def.kind), portfolioId: portfolioId || undefined, location: location || undefined })
  }
  if (!eligible.length) return <EmptyAction title="أنشئ حسابًا أولًا" text="حتى الأصل القائم يحتاج وعاء حسابيًا نعرف أنه موجود داخله." />
  return <FormShell title="تسجيل أصل تملكه مسبقًا" subtitle="اختر المجموعة ثم تابع نزولًا في الشجرة حتى تصل إلى الحساب الذي يحتوي الأصل الآن. المجموعات الفارغة تظل ظاهرة."><form className="trade-form" onSubmit={submit}>
    <AccountCascader state={state} accounts={eligible} value={accountId} onChange={setAccount} label="الحساب / الوعاء" helper="المجموعة ليست حسابًا ولا تُحفظ كوجهة للأصل؛ يجب الوصول إلى حساب نهائي." />
    <Field label="نوع الأصل"><select value={assetTypeId} onChange={e => setType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(item => <option key={item.id} value={item.id}>{item.groupLabel} — {item.label}</option>)}</select></Field>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder={def.label} /></Field><Field label="الرمز (إن وجد)"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder={def.defaultSymbol || ''} /></Field></div>
    <div className="field-grid three"><Field label={`الكمية (${def.defaultUnit})`}><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="إجمالي التكلفة التاريخية"><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="اختياري" /></Field><Field label="القيمة الحالية للوحدة"><input value={current} onChange={e => setCurrent(e.target.value)} inputMode="decimal" placeholder="اختياري" /></Field></div>
    <div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="الموقع الجغرافي للأصل المادي (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="مثال: حلب" /></Field>
    <button className="primary wide" type="submit" disabled={!accountId}>تسجيل الأصل</button>
  </form></FormShell>
}

function TransferForm({ state, accounts, onSubmit }: { state: FinanceState; accounts: Account[]; onSubmit: (input: TransferFundsInput) => void }) {
  const sourceAccounts = accounts.filter(a => state.holdings.some(h => h.kind === 'cash' && !h.archived && h.accountId === a.id && ownerQuantity(h, SELF_ID) > 0))
  const [sourceAccountId, setSourceAccount] = useState('')
  const sourceHoldings = state.holdings.filter(h => h.kind === 'cash' && !h.archived && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
  const [holdingId, setHolding] = useState('')
  const [quantity, setQuantity] = useState('')
  const [targetAccountId, setTargetAccount] = useState('')
  useEffect(() => {
    const first = state.holdings.find(h => h.kind === 'cash' && !h.archived && h.accountId === sourceAccountId && ownerQuantity(h, SELF_ID) > 0)
    setHolding(first?.id ?? '')
    if (sourceAccountId && targetAccountId === sourceAccountId) setTargetAccount('')
  }, [sourceAccountId, state.holdings, targetAccountId])
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ sourceHoldingId: holdingId, ownerId: SELF_ID, quantity: num(quantity), targetAccountId }) }
  if (accounts.length < 2) return <EmptyAction title="تحتاج حسابين على الأقل" text="أنشئ الحسابات مباشرة ثم انقل الأموال بينها." />
  return <FormShell title="نقل أموال" subtitle="اختر المصدر والوجهة عبر نفس شجرة المجموعات. تغيير المجموعة لا ينشئ حركة مالية."><form className="trade-form" onSubmit={submit}>
    <div className="divider">من</div><AccountCascader state={state} accounts={sourceAccounts} value={sourceAccountId} onChange={setSourceAccount} label="حساب المصدر" />
    <div className="field-grid"><Field label="الرصيد"><select value={holdingId} onChange={e => setHolding(e.target.value)}><option value="">اختر الرصيد</option>{sourceHoldings.map(h => <option key={h.id} value={h.id}>{h.symbol} — {ownerQuantity(h, SELF_ID).toLocaleString('ar-SA')}</option>)}</select></Field><Field label="المبلغ"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field></div>
    <div className="divider">إلى</div><AccountCascader state={state} accounts={accounts.filter(a => a.id !== sourceAccountId)} value={targetAccountId} onChange={setTargetAccount} label="حساب الوجهة" />
    <button className="primary wide" type="submit" disabled={!holdingId || !targetAccountId || !quantity.trim()}>نقل الأموال</button>
  </form></FormShell>
}

function PortfolioForm({ owners, portfolios, onSubmit }: { owners: Party[]; portfolios: Portfolio[]; onSubmit: (input: CreatePortfolioInput) => void }) {
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<PortfolioProfile>('investment')
  const [parentId, setParent] = useState('')
  const [purpose, setPurpose] = useState('')
  const [target, setTarget] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, ownerId, parentId: parentId || undefined, profile, purpose: purpose || undefined, targetValueSar: target.trim() ? num(target) : undefined, protectionMode: 'flexible' }); setName('') }
  return <FormShell title="إنشاء محفظة" subtitle="المحفظة WHY؛ وهي مستقلة عن المجموعة والحساب."><form className="trade-form" onSubmit={submit}><div className="field-grid"><Field label="اسم المحفظة"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div><div className="field-grid"><Field label="السلوك"><select value={profile} onChange={e => setProfile(e.target.value as PortfolioProfile)}>{profiles.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="محفظة أم"><select value={parentId} onChange={e => setParent(e.target.value)}><option value="">جذرية</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><Field label="الغرض"><input value={purpose} onChange={e => setPurpose(e.target.value)} /></Field><Field label="الهدف بالريال"><input value={target} onChange={e => setTarget(e.target.value)} inputMode="decimal" /></Field><button className="primary wide" type="submit">إنشاء المحفظة</button></form></FormShell>
}

function AllocateForm({ state, owners, holdings, portfolios, onSubmit }: { state: FinanceState; owners: Party[]; holdings: Holding[]; portfolios: Portfolio[]; onSubmit: (input: AllocateToPortfolioInput) => void }) {
  const [ownerId, setOwner] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const eligible = useMemo(() => holdings.filter(h => ownerQuantity(h, ownerId) > 0), [holdings, ownerId])
  const [holdingId, setHolding] = useState(eligible[0]?.id ?? '')
  const [portfolioId, setPortfolio] = useState(portfolios[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const holding = eligible.find(h => h.id === holdingId)
  const free = holding ? availableQuantity(state, holding.id, ownerId) : 0
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ holdingId, ownerId, portfolioId, quantity: num(quantity) }) }
  return <FormShell title="تخصيص لمحفظة" subtitle="تغيير الغرض فقط؛ الأصل يبقى داخل حسابه مهما كانت مجموعته."><form className="trade-form" onSubmit={submit}><Field label="المالك"><select value={ownerId} onChange={e => { setOwner(e.target.value); setHolding('') }}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="الأصل"><select value={holdingId} onChange={e => setHolding(e.target.value)}><option value="">اختر الأصل</option>{eligible.map(h => <option key={h.id} value={h.id}>{h.name} — حر {availableQuantity(state, h.id, ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field><div className="field-grid"><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /><small>المتاح: {free.toLocaleString('ar-SA')} {holding?.nativeUnit}</small></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><button className="primary wide" type="submit">تخصيص</button></form></FormShell>
}

function FormShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="panel operation-form"><div className="panel-head"><div><span>تنفيذ على بياناتك</span><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span>{label}</span>{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div className="purchase-summary-item"><span>{label}</span><strong>{value}</strong></div> }
function EmptyAction({ title, text }: { title: string; text: string }) { return <div className="panel empty-preview"><WalletCards/><strong>{title}</strong><span>{text}</span></div> }

function helpFor(action: ActionKey) {
  return ({
    purchase: 'حدد حساب الدفع، ثم الأصل وما دفعته وما استلمته، ثم حساب حفظ الأصل. المجموعة لا تدخل في القيد.',
    transfer: 'النقل يحدث بين حسابين؛ تغيير مجموعة أي حساب لا ينقل المال.',
    funds: 'الرصيد الافتتاحي حالة بداية تسجل مرة واحدة ويمكن تعديلها؛ الدخل حركة متكررة. كل رصيد يسكن داخل حساب واحد واضح.',
    existing: 'الأصل القديم يسجل داخل الحساب الذي يحتويه الآن، بلا اختراع حركة شراء حالية.',
    portfolio: 'المحفظة غرض اقتصادي يمكن أن يمتد عبر حسابات ومجموعات متعددة.',
    allocate: 'التخصيص يجيب لماذا، ولا يغير الحساب الذي يحتوي الأصل.',
    account: 'الحساب هو الوعاء الحقيقي. تستطيع وضعه تحت مجموعة أو تركه من الجذر.',
  } as Record<ActionKey, string>)[action]
}
