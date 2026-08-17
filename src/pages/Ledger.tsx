import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, FolderTree, History, Pencil, RefreshCcw, Repeat2, ShieldAlert, SlidersHorizontal, Trash2, UserRound, WalletCards, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import type { ExpenseNecessity, LedgerTransaction } from '../domain/types'
import '../ledger-mobile.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const necessityLabels: Record<ExpenseNecessity, string> = { obligation: 'التزام ملزم', essential: 'أساسي', flexible: 'مرن', discretionary: 'كمالي' }

function localDateTimeValue(iso: string) {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function Ledger() {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)

  const voidOpening = (tx: LedgerTransaction) => {
    if (!window.confirm('حذف هذا الرصيد الافتتاحي؟ سيتم عكس أثره من الرصيد الفعلي مع إبقاء سجل تدقيق للحركة الملغاة.')) return
    const reason = window.prompt('سبب الحذف/الإلغاء:', 'إدخال افتتاحي خاطئ')
    if (!reason?.trim()) return
    try {
      finance.voidOpeningBalance(tx.id, reason)
      toast.success('تم إلغاء الرصيد الافتتاحي وعكس أثره من الرصيد الفعلي.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إلغاء الحركة') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">LOGICAL TRANSACTIONS + AUDIT</span><h2>الحركات</h2><p>الحركة المالية ليست سطرًا للعرض فقط؛ بعض الحركات تغيّر الأرصدة والحيازات فعليًا. لذلك الحذف الآمن يعكس أثر الحركة ثم يحتفظ بها كحركة ملغاة بدل حذف السطر وحده.</p></div><div className="lock-note"><History size={16}/> محفوظة المراجعات</div></section>
    <section className="ledger-feed">{state.ledger.length === 0 ? <div className="empty-preview"><History/><strong>لا توجد حركات بعد</strong><span>ابدأ بإضافة رصيد أو تسجيل مصروف أو شراء أصل.</span></div> : state.ledger.map(tx => {
      const gain = tx.realizedGainLossSar
      const category = tx.expenseCategoryId ? (state.expenseCategories ?? []).find(c => c.id === tx.expenseCategoryId) : undefined
      const portfolio = tx.portfolioId ? state.portfolios.find(p => p.id === tx.portfolioId) : undefined
      const beneficiary = tx.expenseBeneficiaryId ? (state.expenseBeneficiaries ?? []).find(b => b.id === tx.expenseBeneficiaryId) : undefined
      const voided = tx.status === 'voided'
      return <article className={`ledger-event-card${voided ? ' voided' : ''}`} key={tx.id}><div className={`ledger-event-icon ${tx.kind}`}>{kindIcon(tx.kind)}</div><div className="ledger-event-body"><div className="ledger-event-top"><div><span>{new Date(tx.at).toLocaleDateString('ar-SA')} • v{tx.version}{voided ? ' • ملغاة' : ''}</span><strong>{tx.title}</strong></div><div className="ledger-event-amount-actions"><strong className="ledger-event-amount">{money.format(tx.amountSar)} <small>ر.س</small></strong>{!voided && <button className="ledger-edit-button" title="تعديل الحركة" onClick={() => setEditing(tx)}><Pencil size={14}/></button>}{!voided && tx.kind === 'opening' && <button className="ledger-delete-button" title="حذف/إلغاء الرصيد الافتتاحي" onClick={() => voidOpening(tx)}><Trash2 size={14}/></button>}</div></div>{tx.note && <p>{tx.note}</p>}<div className="ledger-event-foot"><span className={`type-chip ${tx.kind}`}>{voided ? 'ملغاة' : kindName(tx.kind)}</span>{category && <span className="realized-chip"><FolderTree size={12}/> {category.name}</span>}{beneficiary && <span className="realized-chip"><UserRound size={12}/> {beneficiary.name}</span>}{tx.expenseNecessity && <span className={`realized-chip necessity-${tx.expenseNecessity}`}>{necessityLabels[tx.expenseNecessity]}</span>}{portfolio && <span className="realized-chip"><Boxes size={12}/> {portfolio.name}</span>}{(tx.kind === 'conversion' || tx.kind === 'asset_sale') && gain != null && <span className={gain >= 0 ? 'profit realized-chip' : 'loss realized-chip'}>محقق {gain >= 0 ? '+' : ''}{money.format(gain)} ر.س</span>}{tx.revisions.length > 0 && <span className="realized-chip"><History size={12}/> {tx.revisions.length} مراجعة</span>}</div></div></article>
    })}</section>

    {editing && <TransactionEditModal tx={editing} state={state} onClose={() => setEditing(null)} onSave={(input) => {
      try {
        finance.reviseTransaction(input)
        toast.success(`تم حفظ مراجعة جديدة للحركة «${input.title}» مع الاحتفاظ بالنسخة السابقة.`)
        setEditing(null)
      } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تعديل الحركة') }
    }} onOpeningSave={(tx, quantity) => {
      const holding = tx.targetHoldingId ? state.holdings.find(h => h.id === tx.targetHoldingId) : undefined
      if (!holding) { toast.error('الرصيد المرتبط بالحركة غير موجود'); return }
      try {
        const unitCost = tx.targetQuantity && tx.targetQuantity > 0 ? tx.amountSar / tx.targetQuantity : holding.marketPriceSar
        finance.addFunds({
          accountId: holding.accountId,
          ownerId: tx.ownerId,
          symbol: holding.symbol,
          nativeUnit: holding.nativeUnit,
          quantity,
          unitCostSar: unitCost,
          marketPriceSar: holding.marketPriceSar,
          classification: 'opening',
          title: tx.title,
          portfolioId: tx.portfolioId,
        })
        toast.success('تم تعديل الرصيد الافتتاحي وإعادة حساب أثره على الرصيد الفعلي. أي إدخالات افتتاحية مكررة لنفس الحساب/المالك/العملة تم توحيدها.')
        setEditing(null)
      } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تعديل الرصيد الافتتاحي') }
    }}/>} 
  </div>
}

function TransactionEditModal({ tx, state, onClose, onSave, onOpeningSave }: { tx: LedgerTransaction; state: ReturnType<typeof useFinance>['state']; onClose: () => void; onSave: (input: Parameters<ReturnType<typeof useFinance>['reviseTransaction']>[0]) => void; onOpeningSave: (tx: LedgerTransaction, quantity: number) => void }) {
  const [title, setTitle] = useState(tx.title)
  const [at, setAt] = useState(localDateTimeValue(tx.at))
  const [note, setNote] = useState(tx.note ?? '')
  const [reason, setReason] = useState('')
  const [categoryId, setCategoryId] = useState(tx.expenseCategoryId ?? '')
  const [beneficiaryId, setBeneficiaryId] = useState(tx.expenseBeneficiaryId ?? '')
  const [necessity, setNecessity] = useState<ExpenseNecessity | ''>(tx.expenseNecessity ?? '')
  const [openingQuantity, setOpeningQuantity] = useState(String(tx.targetQuantity ?? ''))
  const categories = state.expenseCategories ?? []
  const beneficiaries = state.expenseBeneficiaries ?? []

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (tx.kind === 'opening') {
      const quantity = Number(openingQuantity.replace(/,/g, ''))
      if (!Number.isFinite(quantity) || quantity <= 0) return
      onOpeningSave(tx, quantity)
      return
    }
    onSave({
      transactionId: tx.id,
      reason,
      at: new Date(at).toISOString(),
      title,
      note: note || undefined,
      expenseCategoryId: tx.kind === 'expense' ? categoryId || undefined : undefined,
      expenseBeneficiaryId: tx.kind === 'expense' ? beneficiaryId || undefined : undefined,
      expenseNecessity: tx.kind === 'expense' ? necessity || undefined : undefined,
    })
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="expense-modal transaction-edit-modal" role="dialog" aria-modal="true" aria-label="تعديل حركة"><button className="modal-close" onClick={onClose} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>LOGICAL TRANSACTION • v{tx.version}</span><h2>{tx.kind === 'opening' ? 'تعديل الرصيد الافتتاحي' : 'تعديل الحركة'}</h2><span>{tx.kind === 'opening' ? 'الرصيد الافتتاحي يسجل مرة واحدة فقط. تعديل القيمة سيعيد حساب الفرق على الرصيد الفعلي ويحتفظ بتاريخ المراجعة.' : 'سيبقى نفس معرّف الحركة، وتُحفظ النسخة الحالية في سجل المراجعات قبل اعتماد التعديل.'}</span></div></div><form className="trade-form" onSubmit={submit}>
    {tx.kind === 'opening' ? <>
      <label><span>الرصيد الافتتاحي</span><input autoFocus value={openingQuantity} onChange={e => setOpeningQuantity(e.target.value)} inputMode="decimal" /></label>
      <div className="operation-rule"><span>إذا كانت لديك إدخالات افتتاحية مكررة لنفس الحساب والمالك والعملة، فهذه العملية ستوحدها إلى رصيد افتتاحي واحد بالقيمة التي تحددها هنا.</span></div>
    </> : <>
      <div className="field-grid"><label><span>عنوان الحركة</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} /></label><label><span>التاريخ والوقت</span><input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label></div>
      <label><span>ملاحظة</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="اختياري" /></label>

      {tx.kind === 'expense' && <><div className="divider">تصنيف المصروف</div><div className="field-grid"><label><span>بند الصرف</span><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">غير محدد</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'archived' ? ' — مؤرشف' : ''}</option>)}</select></label><label><span>المستفيد</span><select value={beneficiaryId} onChange={e => setBeneficiaryId(e.target.value)}><option value="">غير محدد</option>{beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name}{b.status === 'archived' ? ' — مؤرشف' : ''}</option>)}</select></label></div><label><span>درجة الضرورة</span><select value={necessity} onChange={e => setNecessity(e.target.value as ExpenseNecessity | '')}><option value="">غير مصنف</option><option value="obligation">التزام ملزم</option><option value="essential">أساسي</option><option value="flexible">مرن / قابل للضبط</option><option value="discretionary">كمالي / اختياري</option></select></label></>}

      <div className="financial-fields-lock"><ShieldAlert size={18}/><div><strong>الحقول المالية مقفلة في هذا النوع من التعديل</strong><span>المبلغ: {money.format(tx.amountSar)} ر.س{tx.sourceQuantity != null ? ` • الكمية الخارجة: ${tx.sourceQuantity}` : ''}{tx.targetQuantity != null ? ` • الكمية الداخلة: ${tx.targetQuantity}` : ''}</span><small>تغيير المبلغ أو مصدر/وجهة الحركة أو المحفظة قد يعيد حساب الرصيد وCost Basis والتخصيصات. لن نغيّرها بصمت حتى يدعم محرك إعادة الإسقاط المالي ذلك بصورة كاملة.</small></div></div>
      <label><span>سبب التعديل *</span><input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: تصحيح المستفيد / التاريخ / بند الصرف" required /></label>
    </>}

    {tx.revisions.length > 0 && <div className="revision-history"><strong>سجل المراجعات السابق</strong>{[...tx.revisions].reverse().map((rev, index) => <div className="revision-history-row" key={`${rev.version}-${rev.changedAt}-${index}`}><span>v{rev.version} • {new Date(rev.changedAt).toLocaleString('ar-SA')}</span><b>{rev.reason}</b><small>{rev.snapshot.title} • {money.format(rev.snapshot.amountSar)} ر.س</small></div>)}</div>}
    <button className="primary wide" type="submit">{tx.kind === 'opening' ? 'حفظ الرصيد الافتتاحي المصحح' : `حفظ كمراجعة v${tx.version + 1}`}</button>
  </form></section></div>
}

function kindIcon(kind: string): ReactNode { const icons: Record<string, ReactNode> = { opening: <WalletCards size={18}/>, income: <ArrowDownLeft size={18}/>, expense: <ArrowUpRight size={18}/>, real_transfer: <ArrowLeftRight size={18}/>, asset_purchase: <ArrowUpRight size={18}/>, asset_sale: <ArrowDownLeft size={18}/>, conversion: <Repeat2 size={18}/>, allocation_settlement: <SlidersHorizontal size={18}/>, ownership_event: <SlidersHorizontal size={18}/>, liability_creation: <ArrowUpRight size={18}/>, liability_payment: <ArrowDownLeft size={18}/>, reconciliation: <RefreshCcw size={18}/>, refund: <RefreshCcw size={18}/> }; return icons[kind] ?? <RefreshCcw size={18}/> }
function kindName(kind: string) { return ({ opening: 'افتتاحي', income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', asset_purchase: 'شراء أصل', asset_sale: 'بيع أصل', conversion: 'تحويل أصل', allocation_settlement: 'تسوية محفظة', ownership_event: 'ملكية/دين', liability_creation: 'إنشاء التزام', liability_payment: 'سداد التزام', reconciliation: 'مطابقة', refund: 'استرداد' } as Record<string, string>)[kind] ?? kind }
