import { Banknote, Boxes, CircleAlert, ReceiptText } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import { availableQuantity, ownerQuantity, round2 } from '../domain/finance'
import type { ExpenseCategory } from '../domain/types'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

function categoryPath(all: ExpenseCategory[], category: ExpenseCategory): string {
  const parts = [category.name]
  let current = category
  const seen = new Set<string>()
  while (current.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId)
    const parent = all.find(c => c.id === current.parentId)
    if (!parent) break
    parts.unshift(parent.name)
    current = parent
  }
  return parts.join(' ← ')
}

export function SpendExpense() {
  const finance = useFinance()
  const toast = useToast()
  const { state } = finance
  const owners = state.parties.filter(p => p.type === 'self' || p.type === 'person')
  const categories = (state.expenseCategories ?? []).filter(c => c.status === 'active')
  const [ownerId, setOwnerId] = useState(owners.find(o => o.id === SELF_ID)?.id ?? owners[0]?.id ?? '')
  const cashHoldings = useMemo(() => state.holdings.filter(h => !h.archived && h.kind === 'cash' && ownerQuantity(h, ownerId) > 0), [state.holdings, ownerId])
  const portfolios = state.portfolios.filter(p => p.status === 'active' && p.ownerIds.includes(ownerId))
  const [sourceHoldingId, setSourceHoldingId] = useState(cashHoldings[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [portfolioId, setPortfolioId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const source = cashHoldings.find(h => h.id === sourceHoldingId)
  const sourceAccount = source ? state.accounts.find(a => a.id === source.accountId) : undefined
  const amount = Number(quantity.replace(/,/g, '')) || 0
  const amountSar = source ? round2(amount * source.marketPriceSar) : 0
  const freeQty = source ? availableQuantity(state, source.id, ownerId) : 0
  const portfolioValue = portfolioId ? round2(state.portfolioSlices.filter(s => s.portfolioId === portfolioId && s.ownerId === ownerId).reduce((sum, s) => {
    const h = state.holdings.find(x => x.id === s.holdingId && !x.archived)
    return sum + (h ? s.quantity * h.marketPriceSar : 0)
  }, 0)) : 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      finance.spendExpense({ sourceHoldingId, ownerId, quantity: amount, expenseCategoryId: categoryId, portfolioId: portfolioId || undefined, title: title || undefined, note: note || undefined })
      setQuantity(''); setTitle(''); setNote('')
      toast.success(portfolioId ? 'تم تسجيل المصروف وخصمه من الحساب واستهلاكه من المحفظة.' : 'تم تسجيل المصروف وخصمه من السيولة الحرة.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تسجيل المصروف') }
  }

  const prerequisitesMissing = categories.length === 0 || cashHoldings.length === 0

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">EXPENSE / WHAT + WHERE + WHY</span><h2>تسجيل مصروف</h2><p>اختر بند الصرف ليصف «على ماذا؟»، ومصدر الدفع ليصف «من أين خرج؟»، والمحفظة اختيارية لتصف «من أي غرض/مخصص؟».</p></div></section>
    {prerequisitesMissing && <section className="panel prerequisite-note"><CircleAlert size={20} /><div><strong>قبل أول مصروف</strong><p>{categories.length === 0 ? 'أنشئ بند صرف واحدًا على الأقل من تبويب «بنود الصرف». ' : ''}{cashHoldings.length === 0 ? 'وأضف حسابًا ورصيدًا نقديًا من «العمليات العامة».' : ''}</p></div></section>}
    <section className="operation-workspace"><div className="operation-form-panel"><div className="panel operation-form"><div className="panel-head"><div><span>حركة مالية فعلية</span><h2>بيانات عملية الصرف</h2><span>المصروف يقلل الثروة. ربطه بمحفظة يستهلك أيضًا من تخصيص المحفظة، لكنه لا يغير حقيقة الحساب الذي دفع.</span></div><ReceiptText size={18} /></div><form className="trade-form" onSubmit={submit}>
      <div className="field-grid"><label><span>المالك</span><select value={ownerId} onChange={e => { setOwnerId(e.target.value); setSourceHoldingId(''); setPortfolioId('') }}>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label><span>بند الصرف</span><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">اختر بندًا</option>{categories.map(c => <option key={c.id} value={c.id}>{categoryPath(categories, c)}</option>)}</select></label></div>
      <label><span>مصدر الدفع الفعلي</span><select value={sourceHoldingId} onChange={e => setSourceHoldingId(e.target.value)}><option value="">اختر رصيدًا</option>{cashHoldings.map(h => <option key={h.id} value={h.id}>{state.parties.find(p => p.id === h.custodianId)?.name ?? ''} ← {state.accounts.find(a => a.id === h.accountId)?.name ?? h.name} — {ownerQuantity(h, ownerId).toLocaleString('ar-SA')} {h.nativeUnit}</option>)}</select><small>{source ? `المتاح الحر في هذا الرصيد: ${freeQty.toLocaleString('ar-SA')} ${source.nativeUnit}` : 'اختر الحساب/الرصيد الذي خرج منه المال فعليًا.'}</small></label>
      <div className="field-grid"><label><span>الكمية المصروفة {source ? `(${source.nativeUnit})` : ''}</span><input value={quantity} onChange={e => setQuantity(e.target.value)} inputMode="decimal" placeholder="0" /></label><label><span>المحفظة</span><select value={portfolioId} onChange={e => setPortfolioId(e.target.value)}><option value="">بلا محفظة — من السيولة الحرة</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small>{portfolioId ? `الرصيد الاقتصادي المخصص حاليًا: ${money.format(portfolioValue)} ر.س` : 'لن يُستهلك أي تخصيص محفظة.'}</small></label></div>
      <div className="field-grid"><label><span>عنوان مختصر (اختياري)</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="فاتورة كهرباء أغسطس" /></label><label><span>ملاحظة (اختياري)</span><input value={note} onChange={e => setNote(e.target.value)} /></label></div>
      <div className="inline-preview"><span>القيمة بالتقارير</span><strong>{money.format(amountSar)} ر.س</strong><small>{source ? `${amount.toLocaleString('ar-SA')} ${source.nativeUnit} × ${source.marketPriceSar.toLocaleString('ar-SA')} ر.س` : 'اختر مصدر الدفع'}</small></div>
      <button className="primary wide" type="submit" disabled={prerequisitesMissing || !sourceHoldingId || !categoryId}>تسجيل المصروف</button>
    </form></div></div><aside className="operation-help expense-explain"><Banknote size={20} /><strong>كيف يُقيد؟</strong><div className="expense-dimension"><b>WHAT</b><span>بند الصرف الشجري</span></div><div className="expense-dimension"><b>WHERE</b><span>{sourceAccount?.name ?? 'مصدر الدفع'}</span></div><div className="expense-dimension"><b>WHY</b><span>{portfolioId ? state.portfolios.find(p => p.id === portfolioId)?.name : 'السيولة الحرة'}</span></div><div className="operation-rule"><Boxes size={15} /><span>المحفظة لا تصبح حسابًا. نحن نستهلك غرضها الاقتصادي بينما الخصم المادي يحدث في الحساب المحدد.</span></div></aside></section>
  </div>
}