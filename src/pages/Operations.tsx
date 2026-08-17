import { ArrowLeftRight, BanknoteArrowDown, Boxes, CirclePlus, FolderPlus, Landmark, PackagePlus, ShoppingCart, WalletCards } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { AddAccountInput, AddFundsInput, AllocateToPortfolioInput, CreatePortfolioInput, ExistingAssetInput, PurchaseAssetInput, TransferFundsInput } from '../application/commands'
import { availableQuantity, ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { AccountKind, AssetKind, PerformanceRole, PortfolioProfile } from '../domain/types'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
type ActionKey = 'purchase' | 'transfer' | 'funds' | 'existing' | 'portfolio' | 'allocate' | 'account'

const actions: { id: ActionKey; title: string; sub: string; icon: typeof ShoppingCart }[] = [
  { id: 'purchase', title: 'شراء أصل', sub: 'من رصيد فعلي مع Cost Basis', icon: ShoppingCart },
  { id: 'transfer', title: 'نقل أموال', sub: 'بين حسابين بدون P/L', icon: ArrowLeftRight },
  { id: 'funds', title: 'إضافة أموال', sub: 'رصيد افتتاحي أو دخل', icon: BanknoteArrowDown },
  { id: 'existing', title: 'إضافة أصل قائم', sub: 'بدون دفع وهمي', icon: PackagePlus },
  { id: 'portfolio', title: 'إنشاء محفظة', sub: 'غرض وهدف وسلوك', icon: FolderPlus },
  { id: 'allocate', title: 'تخصيص لمحفظة', sub: 'تغيير الغرض فقط', icon: Boxes },
  { id: 'account', title: 'إضافة حساب', sub: 'بنك، خزنة أو منصة', icon: Landmark },
]

const assetKinds: { value: AssetKind; label: string }[] = [
  ['metal', 'ذهب / فضة / معادن'], ['crypto', 'عملة رقمية'], ['fund', 'صندوق'], ['stock', 'سهم'], ['real_estate', 'عقار / أرض'], ['vehicle', 'سيارة / مركبة'], ['fixed_term', 'استثمار لأجل'], ['collectible', 'مقتنيات'], ['receivable', 'مستحقات'], ['other', 'أصل آخر'], ['cash', 'نقد / عملة'],
].map(([value, label]) => ({ value: value as AssetKind, label }))

const roles: { value: PerformanceRole; label: string }[] = [
  { value: 'investment', label: 'استثمار — يظهر الربح/الخسارة السوقية' },
  { value: 'store_of_value', label: 'مخزن قيمة — ذهب/أصل ادخاري' },
  { value: 'transactional_cash', label: 'سيولة تشغيلية — لا P/L يومي افتراضيًا' },
  { value: 'bridge', label: 'أصل وسيط — تُرحّل تكلفته للأصل النهائي' },
]

const profiles: { value: PortfolioProfile; label: string }[] = [
  { value: 'investment', label: 'استثمار' }, { value: 'savings_goal', label: 'ادخار / هدف' }, { value: 'reserve', label: 'احتياطي' },
  { value: 'commitment', label: 'التزام' }, { value: 'spending_budget', label: 'ميزانية مصروف' }, { value: 'deal', label: 'عملية / صفقة' },
]

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'checking', label: 'حساب جاري' }, { value: 'saving', label: 'حساب ادخار' }, { value: 'investment', label: 'منصة / حساب استثماري' },
  { value: 'cash_container', label: 'خزنة / نقد فعلي' }, { value: 'custody', label: 'حفظ / مكان أصل' }, { value: 'fixed_term', label: 'استثمار لأجل' }, { value: 'prepaid', label: 'مسبق الدفع' },
]

function num(value: string) { return Number(value.replace(/,/g, '')) }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }

export function Operations({ goTrade }: { goTrade: () => void }) {
  const finance = useFinance()
  const { state } = finance
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const accounts = state.accounts.filter(a => a.status === 'active')
  const portfolios = state.portfolios.filter(p => p.status === 'active')
  const ownedHoldings = state.holdings.filter(h => !h.archived && h.ownership.some(s => s.quantity > 0))
  const cashHoldings = ownedHoldings.filter(h => h.kind === 'cash')
  const [action, setAction] = useState<ActionKey>('purchase')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const execute = (fn: () => void, text: string) => {
    try { fn(); setMessage({ type: 'ok', text }) } catch (error) { setMessage({ type: 'error', text: errorText(error) }) }
  }

  return <div className="page-stack operations-page">
    <section className="section-intro operations-intro">
      <div><span className="eyebrow">GENERAL COMMANDS / NOT PRESET SCENARIOS</span><h2>العمليات المالية</h2><p>هنا تنشئ بياناتك وتحركها بنفسك. السيناريوهات أصبحت للاختبار فقط؛ هذه الأوامر تعمل على نفس الحسابات والأصول والمحافظ والـLedger.</p></div>
      <button className="secondary operations-convert" onClick={goTrade}><ArrowLeftRight size={17} /> تحويل أصل إلى أصل</button>
    </section>

    <section className="action-picker">
      {actions.map(item => { const Icon = item.icon; return <button key={item.id} className={action === item.id ? 'action-choice active' : 'action-choice'} onClick={() => { setAction(item.id); setMessage(null) }}><Icon size={18} /><span><strong>{item.title}</strong><small>{item.sub}</small></span></button> })}
    </section>

    {message && <div className={message.type === 'ok' ? 'operation-message ok' : 'operation-message error'}>{message.text}</div>}

    <section className="operation-workspace">
      <div className="operation-form-panel">
        {action === 'purchase' && <PurchaseForm state={state} ownerId={SELF_ID} cashHoldings={cashHoldings} accounts={accounts} portfolios={portfolios} onSubmit={(input: PurchaseAssetInput) => execute(() => finance.purchaseAsset(input), 'تم شراء الأصل وتحديث الحساب وCost Basis والمركز.')} />}
        {action === 'transfer' && <TransferForm state={state} ownerId={SELF_ID} cashHoldings={cashHoldings} accounts={accounts} onSubmit={(input: TransferFundsInput) => execute(() => finance.transferFunds(input), 'تم نقل الأموال بين الحسابات بدون تسجيل ربح أو خسارة.')} />}
        {action === 'funds' && <FundsForm owners={owners} accounts={accounts} portfolios={portfolios} onSubmit={(input: AddFundsInput) => execute(() => finance.addFunds(input), 'تمت إضافة الرصيد وحفظ مصدره في الحركات.')} />}
        {action === 'existing' && <ExistingAssetForm owners={owners} accounts={accounts} portfolios={portfolios} onSubmit={(input: ExistingAssetInput) => execute(() => finance.addExistingAsset(input), 'تم تسجيل الأصل القائم بدون إنشاء دفع مصرفي وهمي.')} />}
        {action === 'portfolio' && <PortfolioForm owners={owners} portfolios={portfolios} onSubmit={(input: CreatePortfolioInput) => execute(() => finance.createPortfolio(input), 'تم إنشاء المحفظة.')} />}
        {action === 'allocate' && <AllocateForm state={state} owners={owners} holdings={ownedHoldings} portfolios={portfolios} onSubmit={(input: AllocateToPortfolioInput) => execute(() => finance.allocateToPortfolio(input), 'تم تخصيص الأصل للمحفظة بدون حركة نقدية فعلية.')} />}
        {action === 'account' && <AccountForm parties={state.parties} onSubmit={(input: AddAccountInput) => execute(() => finance.addAccount(input), 'تم إنشاء الحساب/الحاوية وأصبح متاحًا للعمليات.')} />}
      </div>
      <aside className="operation-help">
        <WalletCards size={20} />
        <strong>قاعدة التشغيل</strong>
        <p>{helpFor(action)}</p>
        <div className="operation-rule"><CirclePlus size={15} /><span>كل أمر يحدّث الحقيقة المالية نفسها، لذلك سترى نتيجته فورًا في الأصول والمحافظ والحركات.</span></div>
      </aside>
    </section>
  </div>
}

function PurchaseForm({ state, ownerId, cashHoldings, accounts, portfolios, onSubmit }: any) {
  const [sourceHoldingId, setSource] = useState(cashHoldings[0]?.id ?? '')
  const [sourceQuantity, setSourceQuantity] = useState('1000')
  const [accountId, setAccount] = useState(accounts.find((a: any) => a.id === 'acc-broker')?.id ?? accounts[0]?.id ?? '')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [kind, setKind] = useState<AssetKind>('metal')
  const [unit, setUnit] = useState('وحدة')
  const [quantity, setQuantity] = useState('1')
  const [market, setMarket] = useState('')
  const [extra, setExtra] = useState('0')
  const [role, setRole] = useState<PerformanceRole>('investment')
  const [portfolioId, setPortfolio] = useState('')
  const source = cashHoldings.find((h: any) => h.id === sourceHoldingId)
  const unitCost = source ? ownerWeightedAverageCostSar(source, ownerId) : null
  const basis = unitCost == null ? null : round2(num(sourceQuantity || '0') * unitCost + Math.max(0, num(extra || '0')))
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ sourceHoldingId, ownerId, sourceQuantity: num(sourceQuantity), targetAccountId: accountId, name, symbol, kind, nativeUnit: unit, quantity: num(quantity), marketPriceSar: num(market), extraCostsSar: num(extra || '0'), performanceRole: role, portfolioId: portfolioId || undefined }) }
  return <FormShell title="شراء أصل من رصيد فعلي" subtitle="يُنقص مصدر الدفع ويُنشئ Holding + Position ويحمّل تكلفة رأس المال للأصل الجديد."><form className="trade-form" onSubmit={submit}>
    <Field label="مصدر الدفع"><select value={sourceHoldingId} onChange={e => setSource(e.target.value)}>{cashHoldings.map((h: any) => <option key={h.id} value={h.id}>{h.name} — {ownerQuantity(h, ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field>
    <div className="field-grid"><Field label="الكمية المدفوعة"><input value={sourceQuantity} onChange={e => setSourceQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص / من السيولة الحرة</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <div className="divider">الأصل الجديد</div>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أرض حلب / ذهب / XRP" /></Field><Field label="الرمز"><input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="LAND / XAU / XRP" /></Field></div>
    <div className="field-grid three"><Field label="النوع"><select value={kind} onChange={e => setKind(e.target.value as AssetKind)}>{assetKinds.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="الوحدة"><input value={unit} onChange={e => setUnit(e.target.value)} /></Field></div>
    <div className="field-grid"><Field label="القيمة السوقية للوحدة بالريال"><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" placeholder="530" /></Field><Field label="تكاليف إضافية كلية بالريال"><input value={extra} onChange={e => setExtra(e.target.value)} inputMode="decimal" /></Field></div>
    <Field label="مكان الأصل / الحساب"><select value={accountId} onChange={e => setAccount(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
    <Field label="دور الأصل"><select value={role} onChange={e => setRole(e.target.value as PerformanceRole)}>{roles.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field>
    <div className="inline-preview"><span>Cost Basis المتوقع</span><strong>{basis == null ? 'غير معروف' : `${money.format(basis)} ر.س`}</strong><small>القيمة السوقية تبقى مستقلة عن التكلفة.</small></div>
    <button className="primary wide" type="submit">تنفيذ الشراء</button>
  </form></FormShell>
}

function TransferForm({ state, ownerId, cashHoldings, accounts, onSubmit }: any) {
  const [sourceHoldingId, setSource] = useState(cashHoldings[0]?.id ?? '')
  const [quantity, setQuantity] = useState('1000')
  const source = cashHoldings.find((h: any) => h.id === sourceHoldingId)
  const targets = accounts.filter((a: any) => a.id !== source?.accountId)
  const [targetAccountId, setTarget] = useState(targets[0]?.id ?? '')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ sourceHoldingId, ownerId, quantity: num(quantity), targetAccountId }) }
  return <FormShell title="نقل أموال بين الحسابات" subtitle="نفس الأصل ينتقل من WHERE إلى WHERE؛ لا يتحول إلى دخل أو مصروف ولا يُنشئ P/L."><form className="trade-form" onSubmit={submit}>
    <Field label="من"><select value={sourceHoldingId} onChange={e => { setSource(e.target.value); const nextSource = cashHoldings.find((h: any) => h.id === e.target.value); setTarget(accounts.find((a: any) => a.id !== nextSource?.accountId)?.id ?? '') }}>{cashHoldings.map((h: any) => <option key={h.id} value={h.id}>{h.name} — {state.accounts.find((a: any) => a.id === h.accountId)?.name}</option>)}</select></Field>
    <Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /><small>المملوك: {source ? ownerQuantity(source, ownerId).toLocaleString('ar-SA') : 0} {source?.nativeUnit}</small></Field>
    <Field label="إلى الحساب"><select value={targetAccountId} onChange={e => setTarget(e.target.value)}>{targets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
    <button className="primary wide" type="submit">نقل الأموال</button>
  </form></FormShell>
}

function FundsForm({ owners, accounts, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [accountId, setAccount] = useState(accounts[0]?.id ?? '')
  const [symbol, setSymbol] = useState('SAR'); const [unit, setUnit] = useState('ر.س'); const [quantity, setQuantity] = useState('10000')
  const [unitCost, setUnitCost] = useState('1'); const [market, setMarket] = useState('1'); const [classification, setClass] = useState<'opening' | 'income'>('opening'); const [portfolioId, setPortfolio] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ accountId, ownerId, symbol, nativeUnit: unit, quantity: num(quantity), unitCostSar: num(unitCost), marketPriceSar: num(market), classification, portfolioId: portfolioId || undefined }) }
  return <FormShell title="إضافة أموال / رصيد" subtitle="حدد هل هو رصيد قائم عند بداية التسجيل أم دخل جديد؛ الفرق مهم في التقارير."><form className="trade-form" onSubmit={submit}>
    <div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="الحساب"><select value={accountId} onChange={e => setAccount(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <div className="field-grid three"><Field label="العملة"><input value={symbol} onChange={e => setSymbol(e.target.value)} /></Field><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></Field><Field label="الوحدة"><input value={unit} onChange={e => setUnit(e.target.value)} /></Field></div>
    <div className="field-grid"><Field label="تكلفة الوحدة بالريال"><input value={unitCost} onChange={e => setUnitCost(e.target.value)} inputMode="decimal" /></Field><Field label="قيمتها الحالية بالريال"><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" /></Field></div>
    <div className="field-grid"><Field label="التصنيف"><select value={classification} onChange={e => setClass(e.target.value as 'opening' | 'income')}><option value="opening">رصيد قائم / افتتاحي — ليس دخلًا</option><option value="income">دخل جديد</option></select></Field><Field label="المحفظة (اختياري)"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <button className="primary wide" type="submit">إضافة الرصيد</button>
  </form></FormShell>
}

function ExistingAssetForm({ owners, accounts, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [accountId, setAccount] = useState(accounts.find((a: any) => a.id === 'acc-syria-assets')?.id ?? accounts[0]?.id ?? '')
  const [name, setName] = useState(''); const [symbol, setSymbol] = useState(''); const [kind, setKind] = useState<AssetKind>('real_estate'); const [unit, setUnit] = useState('أصل'); const [quantity, setQuantity] = useState('1')
  const [cost, setCost] = useState(''); const [market, setMarket] = useState(''); const [role, setRole] = useState<PerformanceRole>('investment'); const [portfolioId, setPortfolio] = useState(''); const [location, setLocation] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ ownerId, accountId, name, symbol, kind, nativeUnit: unit, quantity: num(quantity), costBasisSar: cost.trim() ? num(cost) : undefined, marketPriceSar: num(market), performanceRole: role, portfolioId: portfolioId || undefined, location: location || undefined }) }
  return <FormShell title="تسجيل أصل موجود لديك أصلًا" subtitle="سيُسجّل كحقيقة افتتاحية ولا يخصم من أي حساب. اترك التكلفة فارغة إن كانت مجهولة."><form className="trade-form" onSubmit={submit}>
    <div className="field-grid"><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="مكان الأصل / الحساب"><select value={accountId} onChange={e => setAccount(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="اسم الأصل"><input value={name} onChange={e => setName(e.target.value)} placeholder="سيارة، أرض، شقة..." /></Field><Field label="الرمز"><input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="CAR / LAND" /></Field></div>
    <div className="field-grid three"><Field label="النوع"><select value={kind} onChange={e => setKind(e.target.value as AssetKind)}>{assetKinds.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} /></Field><Field label="الوحدة"><input value={unit} onChange={e => setUnit(e.target.value)} /></Field></div>
    <div className="field-grid"><Field label="إجمالي التكلفة التاريخية (اختياري)"><input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" placeholder="اتركه فارغًا إن كانت غير معروفة" /></Field><Field label="القيمة السوقية الحالية للوحدة"><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" /></Field></div>
    <div className="field-grid"><Field label="دور الأصل"><select value={role} onChange={e => setRole(e.target.value as PerformanceRole)}>{roles.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}><option value="">بدون تخصيص</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="الموقع (اختياري)"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="حلب / الرياض / الخزنة..." /></Field>
    <button className="primary wide" type="submit">تسجيل الأصل القائم</button>
  </form></FormShell>
}

function PortfolioForm({ owners, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const [name, setName] = useState(''); const [profile, setProfile] = useState<PortfolioProfile>('investment'); const [parentId, setParent] = useState(''); const [purpose, setPurpose] = useState(''); const [target, setTarget] = useState(''); const [dueDate, setDue] = useState(''); const [settlement, setSettlement] = useState('SAR'); const [protection, setProtection] = useState<'flexible' | 'designated' | 'hard_reserved' | 'instrument_bound'>('flexible')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, ownerId, parentId: parentId || undefined, profile, purpose: purpose || undefined, targetValueSar: target.trim() ? num(target) : undefined, dueDate: dueDate || undefined, settlementAssetSymbol: profile === 'commitment' ? settlement : undefined, protectionMode: protection }) }
  return <FormShell title="إنشاء محفظة" subtitle="المحفظة WHY: غرض مستمر أو التزام أو ادخار أو استثمار؛ ليست حسابًا بنكيًا."><form className="trade-form" onSubmit={submit}>
    <div className="field-grid"><Field label="اسم المحفظة"><input value={name} onChange={e => setName(e.target.value)} placeholder="إيجار المنزل / استثمار الذهب / دراسة الطفل" /></Field><Field label="المالك"><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="السلوك"><select value={profile} onChange={e => setProfile(e.target.value as PortfolioProfile)}>{profiles.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="تحت محفظة (اختياري)"><select value={parentId} onChange={e => setParent(e.target.value)}><option value="">محفظة جذرية</option>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <Field label="الغرض"><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="لماذا أحجز وأدير هذا المال؟" /></Field>
    <div className="field-grid"><Field label="الهدف / المطلوب بالريال"><input value={target} onChange={e => setTarget(e.target.value)} inputMode="decimal" /></Field><Field label="سياسة الحماية"><select value={protection} onChange={e => setProtection(e.target.value as any)}><option value="flexible">مرنة</option><option value="designated">مخصصة</option><option value="hard_reserved">محجوزة بقوة</option><option value="instrument_bound">مرتبطة بأداة</option></select></Field></div>
    {profile === 'commitment' && <div className="field-grid"><Field label="موعد الاستحقاق"><input type="date" value={dueDate} onChange={e => setDue(e.target.value)} /></Field><Field label="أصل السداد"><input value={settlement} onChange={e => setSettlement(e.target.value)} /></Field></div>}
    <button className="primary wide" type="submit">إنشاء المحفظة</button>
  </form></FormShell>
}

function AllocateForm({ state, owners, holdings, portfolios, onSubmit }: any) {
  const [ownerId, setOwner] = useState(owners.find((o: any) => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const eligible = useMemo(() => holdings.filter((h: any) => ownerQuantity(h, ownerId) > 0), [holdings, ownerId])
  const [holdingId, setHolding] = useState(eligible[0]?.id ?? '')
  const [portfolioId, setPortfolio] = useState(portfolios[0]?.id ?? '')
  const [quantity, setQuantity] = useState('1000')
  const holding = eligible.find((h: any) => h.id === holdingId)
  const free = holding ? availableQuantity(state, holding.id, ownerId) : 0
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ holdingId, ownerId, portfolioId, quantity: num(quantity) }) }
  return <FormShell title="تخصيص أصل أو نقد لمحفظة" subtitle="هذا يغيّر WHY فقط ولا يحرك الأصل بين الحسابات."><form className="trade-form" onSubmit={submit}>
    <Field label="المالك"><select value={ownerId} onChange={e => { setOwner(e.target.value); setHolding('') }}>{owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <Field label="الأصل"><select value={holdingId} onChange={e => setHolding(e.target.value)}><option value="">اختر أصلًا</option>{eligible.map((h: any) => <option key={h.id} value={h.id}>{h.name} — متاح {availableQuantity(state, h.id, ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select></Field>
    <div className="field-grid"><Field label="الكمية"><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /><small>الحر: {free.toLocaleString('ar-SA')} {holding?.nativeUnit}</small></Field><Field label="المحفظة"><select value={portfolioId} onChange={e => setPortfolio(e.target.value)}>{portfolios.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <button className="primary wide" type="submit">تخصيص للمحفظة</button>
  </form></FormShell>
}

function AccountForm({ parties, onSubmit }: any) {
  const [name, setName] = useState(''); const [kind, setKind] = useState<AccountKind>('checking'); const [custodianId, setCustodian] = useState(parties.find((p: any) => p.id === SELF_ID)?.id ?? parties[0]?.id ?? ''); const [currency, setCurrency] = useState('SAR'); const [last4, setLast4] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ name, kind, custodianId, currency: currency || undefined, last4: last4 || undefined }) }
  return <FormShell title="إضافة حساب أو حاوية" subtitle="الحساب يجيب أين يوجد الأصل؛ لا يُنشئ قيمة مالية بذاته."><form className="trade-form" onSubmit={submit}>
    <Field label="اسم الحساب"><input value={name} onChange={e => setName(e.target.value)} placeholder="جاري الراجحي / خزنة المنزل / Binance" /></Field>
    <div className="field-grid"><Field label="النوع"><select value={kind} onChange={e => setKind(e.target.value as AccountKind)}>{accountKinds.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field><Field label="الحافظ / المؤسسة"><select value={custodianId} onChange={e => setCustodian(e.target.value)}>{parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
    <div className="field-grid"><Field label="العملة الأساسية (اختياري)"><input value={currency} onChange={e => setCurrency(e.target.value)} /></Field><Field label="آخر 4 أرقام (اختياري)"><input value={last4} onChange={e => setLast4(e.target.value)} maxLength={4} /></Field></div>
    <button className="primary wide" type="submit">إضافة الحساب</button>
  </form></FormShell>
}

function FormShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="panel operation-form"><div className="panel-head"><div><span>تنفيذ حقيقي على بيانات التطبيق</span><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span>{label}</span>{children}</label> }

function helpFor(action: ActionKey) {
  return ({
    purchase: 'الشراء يحوّل جزءًا من رأس المال من Cash Holding إلى Asset Holding. Cost Basis يأتي من التكلفة الحقيقية لمصدر الدفع، وليس من القيمة السوقية الجديدة.',
    transfer: 'تحريك SAR من الراجحي إلى الإنماء مثلًا لا يخلق ربحًا أو خسارة. الكمية والتكلفة والغرض الاقتصادي تنتقل مع الأصل نفسه.',
    funds: 'الرصيد الافتتاحي يصف حقيقة موجودة قبل التطبيق، بينما الدخل تدفق جديد. لا نخلط الاثنين.',
    existing: 'سيارة أو أرض تملكها مسبقًا تسجّل بلا خصم من البنك. إذا كانت التكلفة مجهولة تبقى مجهولة ولا نخترع شراءً تاريخيًا.',
    portfolio: 'المحفظة طبقة الغرض والسياسة. يمكنها أن تجمع أصولًا من حسابات متعددة وتبقى مفتوحة سنوات.',
    allocate: 'التخصيص لا يحرك المال في البنك؛ فقط يقول إن جزءًا من هذا الأصل مخصص لهذا الغرض.',
    account: 'الحساب أو الخزنة أو المنصة هو WHERE. القيمة تأتي من Holdings داخله ولا تُحسب مرتين.',
  } as Record<ActionKey, string>)[action]
}
