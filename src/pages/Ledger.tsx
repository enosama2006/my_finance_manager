import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, FolderTree, History, Pencil, RefreshCcw, Repeat2, ShieldAlert, SlidersHorizontal, Trash2, UserRound, WalletCards, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import { assetTypeCatalog, type AssetTypeId } from '../domain/assetCatalog'
import type { ExpenseNecessity, FinanceState, LedgerTransaction } from '../domain/types'
import '../ledger-mobile.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const necessityLabels: Record<ExpenseNecessity, string> = { obligation: 'التزام ملزم', essential: 'أساسي', flexible: 'مرن', discretionary: 'كمالي' }
const n = (value: string) => Number(value.replace(/,/g, ''))

function localDateTimeValue(iso: string) {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function accountLabel(state: FinanceState, accountId: string) {
  const account = state.accounts.find(a => a.id === accountId)
  if (!account) return 'حساب غير موجود'
  if (!account.groupId) return account.name
  const groups = state.accountGroups ?? []
  const path: string[] = []
  let current = groups.find(g => g.id === account.groupId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current.name)
    current = current.parentId ? groups.find(g => g.id === current!.parentId) : undefined
  }
  return `${path.join(' ← ')}${path.length ? ' ← ' : ''}${account.name}`
}

export function Ledger() {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)

  const voidTx = (tx: LedgerTransaction) => {
    const isOpening = tx.kind === 'opening'
    const isPurchase = tx.kind === 'asset_purchase'
    if (!isOpening && !isPurchase) return
    const message = isOpening
      ? 'حذف هذا الرصيد الافتتاحي؟ سيتم عكس أثره من الرصيد الفعلي مع إبقاء سجل تدقيق.'
      : 'إلغاء عملية الشراء؟ سيتم رد مبلغ الشراء إلى مصدره وإزالة الأصل الناتج، مع إبقاء الحركة كملغاة في سجل التدقيق.'
    if (!window.confirm(message)) return
    const reason = window.prompt('سبب الحذف/الإلغاء:', isOpening ? 'إدخال افتتاحي خاطئ' : 'عملية شراء أُدخلت بالخطأ')
    if (!reason?.trim()) return
    try {
      if (isOpening) finance.voidOpeningBalance(tx.id, reason)
      else finance.voidAssetPurchase(tx.id, reason)
      toast.success(isOpening ? 'تم إلغاء الرصيد الافتتاحي وعكس أثره.' : 'تم إلغاء الشراء ورد أثره المالي بأمان.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إلغاء الحركة') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">LOGICAL TRANSACTIONS + AUDIT</span><h2>الحركات</h2><p>التعديل هنا تصحيح للحقيقة المالية: نعكس الأثر القديم ثم نعيد تطبيق البيانات المصححة، ولا ننشئ تحويلًا وهميًا لمجرد أن المستخدم أخطأ في الإدخال.</p></div><div className="lock-note"><History size={16}/> محفوظة المراجعات</div></section>
    <section className="ledger-feed">{state.ledger.length === 0 ? <div className="empty-preview"><History/><strong>لا توجد حركات بعد</strong><span>ابدأ بإضافة رصيد أو تسجيل مصروف أو شراء أصل.</span></div> : state.ledger.map(tx => {
      const gain = tx.realizedGainLossSar
      const category = tx.expenseCategoryId ? (state.expenseCategories ?? []).find(c => c.id === tx.expenseCategoryId) : undefined
      const portfolio = tx.portfolioId ? state.portfolios.find(p => p.id === tx.portfolioId) : undefined
      const beneficiary = tx.expenseBeneficiaryId ? (state.expenseBeneficiaries ?? []).find(b => b.id === tx.expenseBeneficiaryId) : undefined
      const voided = tx.status === 'voided'
      const canVoid = tx.kind === 'opening' || tx.kind === 'asset_purchase'
      return <article className={`ledger-event-card${voided ? ' voided' : ''}`} key={tx.id}>
        <div className={`ledger-event-icon ${tx.kind}`}>{kindIcon(tx.kind)}</div>
        <div className="ledger-event-body">
          <div className="ledger-event-top"><div><span>{new Date(tx.at).toLocaleDateString('ar-SA')} • v{tx.version}{voided ? ' • ملغاة' : ''}</span><strong>{tx.title}</strong></div><div className="ledger-event-amount-actions"><strong className="ledger-event-amount">{money.format(tx.amountSar)} <small>ر.س</small></strong>{!voided && <button className="ledger-edit-button" title="تعديل الحركة" onClick={() => setEditing(tx)}><Pencil size={14}/></button>}{!voided && canVoid && <button className="ledger-delete-button" title="حذف/إلغاء الحركة" onClick={() => voidTx(tx)}><Trash2 size={14}/></button>}</div></div>
          {tx.note && <p>{tx.note}</p>}
          <div className="ledger-event-foot"><span className={`type-chip ${tx.kind}`}>{voided ? 'ملغاة' : kindName(tx.kind)}</span>{category && <span className="realized-chip"><FolderTree size={12}/> {category.name}</span>}{beneficiary && <span className="realized-chip"><UserRound size={12}/> {beneficiary.name}</span>}{tx.expenseNecessity && <span className={`realized-chip necessity-${tx.expenseNecessity}`}>{necessityLabels[tx.expenseNecessity]}</span>}{portfolio && <span className="realized-chip"><Boxes size={12}/> {portfolio.name}</span>}{(tx.kind === 'conversion' || tx.kind === 'asset_sale') && gain != null && <span className={gain >= 0 ? 'profit realized-chip' : 'loss realized-chip'}>محقق {gain >= 0 ? '+' : ''}{money.format(gain)} ر.س</span>}{tx.revisions.length > 0 && <span className="realized-chip"><History size={12}/> {tx.revisions.length} مراجعة</span>}</div>
        </div>
      </article>
    })}</section>

    {editing && <TransactionEditModal tx={editing} state={state} onClose={() => setEditing(null)} onSave={(input) => {
      try { finance.reviseTransaction(input); toast.success('تم حفظ التصحيح مع الاحتفاظ بالنسخة السابقة.'); setEditing(null) }
      catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تعديل الحركة') }
    }} onOpeningSave={(tx, quantity) => {
      const holding = tx.targetHoldingId ? state.holdings.find(h => h.id === tx.targetHoldingId) : undefined
      if (!holding) { toast.error('الرصيد المرتبط بالحركة غير موجود'); return }
      try {
        const unitCost = tx.targetQuantity && tx.targetQuantity > 0 ? tx.amountSar / tx.targetQuantity : holding.marketPriceSar
        finance.addFunds({ accountId: holding.accountId, ownerId: tx.ownerId, symbol: holding.symbol, nativeUnit: holding.nativeUnit, quantity, unitCostSar: unitCost, marketPriceSar: holding.marketPriceSar, classification: 'opening', title: tx.title, portfolioId: tx.portfolioId })
        toast.success('تم تعديل الرصيد الافتتاحي وإعادة حساب أثره.'); setEditing(null)
      } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تعديل الرصيد الافتتاحي') }
    }} onPurchaseSave={(input) => {
      try { finance.correctAssetPurchase(input); toast.success('تم تصحيح عملية الشراء وعكس الإسقاط القديم ثم تطبيق البيانات الجديدة.'); setEditing(null) }
      catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تصحيح عملية الشراء') }
    }}/>} 
  </div>
}

type State = ReturnType<typeof useFinance>['state']
type ReviseInput = Parameters<ReturnType<typeof useFinance>['reviseTransaction']>[0]
type PurchaseCorrectionInput = Parameters<ReturnType<typeof useFinance>['correctAssetPurchase']>[0]

function TransactionEditModal({ tx, state, onClose, onSave, onOpeningSave, onPurchaseSave }: { tx: LedgerTransaction; state: State; onClose: () => void; onSave: (input: ReviseInput) => void; onOpeningSave: (tx: LedgerTransaction, quantity: number) => void; onPurchaseSave: (input: PurchaseCorrectionInput) => void }) {
  if (tx.kind === 'opening') return <OpeningEditor tx={tx} onClose={onClose} onSave={onOpeningSave}/>
  if (tx.kind === 'asset_purchase') return <PurchaseEditor tx={tx} state={state} onClose={onClose} onSave={onPurchaseSave}/>
  return <SafeEditor tx={tx} state={state} onClose={onClose} onSave={onSave}/>
}

function OpeningEditor({ tx, onClose, onSave }: { tx: LedgerTransaction; onClose: () => void; onSave: (tx: LedgerTransaction, quantity: number) => void }) {
  const [quantity, setQuantity] = useState(String(tx.targetQuantity ?? ''))
  return <Modal title="تعديل الرصيد الافتتاحي" subtitle="الرصيد الافتتاحي يسجل مرة واحدة؛ هذا التصحيح يعيد حساب الفرق على الرصيد الفعلي." onClose={onClose}><form className="trade-form" onSubmit={e => { e.preventDefault(); const value = n(quantity); if (value > 0) onSave(tx, value) }}><label><span>الرصيد الافتتاحي</span><input autoFocus value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></label><button className="primary wide" type="submit">حفظ الرصيد المصحح</button><RevisionHistory tx={tx}/></form></Modal>
}

function PurchaseEditor({ tx, state, onClose, onSave }: { tx: LedgerTransaction; state: State; onClose: () => void; onSave: (input: PurchaseCorrectionInput) => void }) {
  const u = tx.userInput?.kind === 'asset_purchase' ? tx.userInput : undefined
  const target = tx.targetHoldingId ? state.holdings.find(h => h.id === tx.targetHoldingId) : undefined
  const source = tx.sourceHoldingId ? state.holdings.find(h => h.id === tx.sourceHoldingId) : undefined
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const cashHoldings = state.holdings.filter(h => !h.archived && h.kind === 'cash')
  const targetAccounts = state.accounts.filter(a => a.status === 'active' && a.kind !== 'credit_card')
  const [sourceHoldingId, setSource] = useState(u?.sourceHoldingId ?? source?.id ?? '')
  const [ownerId, setOwner] = useState(u?.ownerId ?? tx.ownerId)
  const [amountPaid, setAmount] = useState(String(u?.amountPaid ?? tx.sourceQuantity ?? ''))
  const [targetAccountId, setTargetAccount] = useState(u?.targetAccountId ?? target?.accountId ?? '')
  const [assetTypeId, setAssetType] = useState<AssetTypeId>((u?.assetTypeId as AssetTypeId | undefined) ?? 'other')
  const [name, setName] = useState(u?.name ?? target?.name ?? tx.title.replace(/^شراء\s*/, ''))
  const [symbol, setSymbol] = useState(u?.symbol ?? target?.symbol ?? '')
  const [quantity, setQuantity] = useState(String(u?.quantity ?? tx.targetQuantity ?? ''))
  const [extraCosts, setExtraCosts] = useState(String(u?.extraCostsSar ?? tx.feesSar ?? 0))
  const [market, setMarket] = useState(String(u?.marketUnitPriceSar ?? target?.marketPriceSar ?? ''))
  const [location, setLocation] = useState(u?.location ?? target?.location ?? '')
  const [at, setAt] = useState(localDateTimeValue(tx.at))
  const [title, setTitle] = useState(tx.title)
  const [note, setNote] = useState(tx.note ?? '')
  const [reason, setReason] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave({ transactionId: tx.id, reason, at: new Date(at).toISOString(), title, note: note || undefined, sourceHoldingId, ownerId, amountPaid: n(amountPaid), targetAccountId, assetTypeId, name, symbol: symbol || undefined, quantity: n(quantity), extraCostsSar: n(extraCosts || '0'), location: location || undefined, marketUnitPriceSar: market.trim() ? n(market) : undefined, marketSource: u?.marketSource || target?.valuationSource || 'user-correction' })
  }

  return <Modal title="تصحيح شراء أصل" subtitle="هذا ليس تحويلًا جديدًا: سيتم عكس الشراء القديم ثم إعادة تطبيق المعلومات المصححة على الحقيقة المالية." onClose={onClose}><form className="trade-form" onSubmit={submit}>
    <div className="divider">من أين خُصم؟</div>
    <div className="field-grid"><label><span>مصدر الدفع</span><select value={sourceHoldingId} onChange={e => setSource(e.target.value)}>{cashHoldings.map(h => <option key={h.id} value={h.id}>{accountLabel(state, h.accountId)} — {h.symbol} ({money.format(ownerQuantityFor(h, ownerId))})</option>)}</select></label><label><span>المالك</span><select value={ownerId} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div>
    <div className="field-grid"><label><span>المبلغ المدفوع</span><input value={amountPaid} onChange={e => setAmount(e.target.value)} inputMode="decimal" /></label><label><span>رسوم/تكاليف إضافية</span><input value={extraCosts} onChange={e => setExtraCosts(e.target.value)} inputMode="decimal" /></label></div>

    <div className="divider">ماذا اشتريت وأين حُفظ؟</div>
    <div className="field-grid"><label><span>نوع الأصل</span><select value={assetTypeId} onChange={e => setAssetType(e.target.value as AssetTypeId)}>{assetTypeCatalog.map(x => <option key={x.id} value={x.id}>{x.groupLabel} — {x.label}</option>)}</select></label><label><span>حساب حفظ الأصل</span><select value={targetAccountId} onChange={e => setTargetAccount(e.target.value)}>{targetAccounts.map(a => <option key={a.id} value={a.id}>{accountLabel(state, a.id)}</option>)}</select></label></div>
    <div className="field-grid"><label><span>اسم الأصل</span><input value={name} onChange={e => setName(e.target.value)} /></label><label><span>الرمز</span><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} /></label></div>
    <div className="field-grid"><label><span>الكمية</span><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" /></label><label><span>القيمة الحالية للوحدة</span><input value={market} onChange={e => setMarket(e.target.value)} inputMode="decimal" /></label></div>
    <label><span>الموقع الجغرافي للأصل المادي (اختياري)</span><input value={location} onChange={e => setLocation(e.target.value)} /></label>

    <div className="divider">بيانات الحركة</div>
    <div className="field-grid"><label><span>العنوان</span><input value={title} onChange={e => setTitle(e.target.value)} /></label><label><span>التاريخ والوقت</span><input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label></div>
    <label><span>ملاحظة</span><input value={note} onChange={e => setNote(e.target.value)} /></label>
    <label><span>سبب التصحيح *</span><input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: تم اختيار حساب حفظ الذهب أو حساب الخصم بشكل خاطئ" required /></label>
    <div className="operation-rule"><span>إذا كان هذا الأصل قد دخل في بيع/نقل/تقسيم لاحق فلن يخمن التطبيق النتيجة؛ سيطلب Replay للسلسلة بدل إفساد البيانات.</span></div>
    <button className="primary wide" type="submit">عكس القديم وتطبيق التصحيح</button><RevisionHistory tx={tx}/>
  </form></Modal>
}

function ownerQuantityFor(holding: State['holdings'][number], ownerId: string) { return holding.ownership.filter(x => x.ownerId === ownerId).reduce((sum, x) => sum + x.quantity, 0) }

function SafeEditor({ tx, state, onClose, onSave }: { tx: LedgerTransaction; state: State; onClose: () => void; onSave: (input: ReviseInput) => void }) {
  const [title, setTitle] = useState(tx.title)
  const [at, setAt] = useState(localDateTimeValue(tx.at))
  const [note, setNote] = useState(tx.note ?? '')
  const [reason, setReason] = useState('')
  const [categoryId, setCategoryId] = useState(tx.expenseCategoryId ?? '')
  const [beneficiaryId, setBeneficiaryId] = useState(tx.expenseBeneficiaryId ?? '')
  const [necessity, setNecessity] = useState<ExpenseNecessity | ''>(tx.expenseNecessity ?? '')
  const categories = state.expenseCategories ?? []
  const beneficiaries = state.expenseBeneficiaries ?? []
  return <Modal title="تعديل الحركة" subtitle="الحقول الوصفية تُراجع الآن؛ الأنواع المالية الأخرى ستنتقل تباعًا إلى نفس محرك Reverse → Reproject المستخدم في شراء الأصل." onClose={onClose}><form className="trade-form" onSubmit={e => { e.preventDefault(); onSave({ transactionId: tx.id, reason, at: new Date(at).toISOString(), title, note: note || undefined, expenseCategoryId: tx.kind === 'expense' ? categoryId || undefined : undefined, expenseBeneficiaryId: tx.kind === 'expense' ? beneficiaryId || undefined : undefined, expenseNecessity: tx.kind === 'expense' ? necessity || undefined : undefined }) }}>
    <div className="field-grid"><label><span>عنوان الحركة</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} /></label><label><span>التاريخ والوقت</span><input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label></div><label><span>ملاحظة</span><input value={note} onChange={e => setNote(e.target.value)} /></label>
    {tx.kind === 'expense' && <><div className="field-grid"><label><span>بند الصرف</span><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">غير محدد</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span>المستفيد</span><select value={beneficiaryId} onChange={e => setBeneficiaryId(e.target.value)}><option value="">غير محدد</option>{beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div><label><span>درجة الضرورة</span><select value={necessity} onChange={e => setNecessity(e.target.value as ExpenseNecessity | '')}><option value="">غير مصنف</option>{Object.entries(necessityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></>}
    <div className="financial-fields-lock"><ShieldAlert size={18}/><div><strong>هذا النوع لم ينتقل بعد إلى Reprojection المالي الكامل</strong><span>المبلغ الحالي: {money.format(tx.amountSar)} ر.س</span><small>لن نسمح بتغيير رقم يختلف بعدها عن Holdings/Cost Basis. شراء الأصل والرصيد الافتتاحي أصبحا يدعمان التصحيح المالي الحقيقي.</small></div></div>
    <label><span>سبب التعديل *</span><input value={reason} onChange={e => setReason(e.target.value)} required /></label><button className="primary wide" type="submit">حفظ كمراجعة v{tx.version + 1}</button><RevisionHistory tx={tx}/>
  </form></Modal>
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="expense-modal transaction-edit-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>AUDITED CORRECTION</span><h2>{title}</h2><span>{subtitle}</span></div></div>{children}</section></div> }
function RevisionHistory({ tx }: { tx: LedgerTransaction }) { return tx.revisions.length ? <div className="revision-history"><strong>سجل المراجعات</strong>{[...tx.revisions].reverse().map((rev, i) => <div className="revision-history-row" key={`${rev.version}-${rev.changedAt}-${i}`}><span>v{rev.version} • {new Date(rev.changedAt).toLocaleString('ar-SA')}</span><b>{rev.reason}</b><small>{rev.snapshot.title} • {money.format(rev.snapshot.amountSar)} ر.س</small></div>)}</div> : null }
function kindIcon(kind: string): ReactNode { const icons: Record<string, ReactNode> = { opening: <WalletCards size={18}/>, income: <ArrowDownLeft size={18}/>, expense: <ArrowUpRight size={18}/>, real_transfer: <ArrowLeftRight size={18}/>, asset_purchase: <ArrowUpRight size={18}/>, asset_sale: <ArrowDownLeft size={18}/>, conversion: <Repeat2 size={18}/>, allocation_settlement: <SlidersHorizontal size={18}/>, ownership_event: <SlidersHorizontal size={18}/>, liability_creation: <ArrowUpRight size={18}/>, liability_payment: <ArrowDownLeft size={18}/>, reconciliation: <RefreshCcw size={18}/>, refund: <RefreshCcw size={18}/> }; return icons[kind] ?? <RefreshCcw size={18}/> }
function kindName(kind: string) { return ({ opening: 'افتتاحي', income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', asset_purchase: 'شراء أصل', asset_sale: 'بيع أصل', conversion: 'تحويل أصل', allocation_settlement: 'تسوية محفظة', ownership_event: 'ملكية/دين', liability_creation: 'إنشاء التزام', liability_payment: 'سداد التزام', reconciliation: 'مطابقة', refund: 'استرداد' } as Record<string, string>)[kind] ?? kind }
