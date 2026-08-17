import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, FolderTree, History, RefreshCcw, Repeat2, SlidersHorizontal, UserRound, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFinance } from '../application/store'
import type { ExpenseNecessity } from '../domain/types'
import '../ledger-mobile.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const necessityLabels: Record<ExpenseNecessity, string> = { obligation: 'التزام ملزم', essential: 'أساسي', flexible: 'مرن', discretionary: 'كمالي' }

export function Ledger() {
  const { state } = useFinance()
  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">LOGICAL TRANSACTIONS + AUDIT</span><h2>الحركات</h2><p>كل مصروف يحتفظ ببند الصرف والمستفيد ودرجة الضرورة التي كانت فعالة وقت تسجيله، لذلك تعديل التصنيف الافتراضي لاحقًا لا يعيد كتابة التاريخ.</p></div><div className="lock-note"><History size={16}/> محفوظة المراجعات</div></section>
    <section className="ledger-feed">{state.ledger.length === 0 ? <div className="empty-preview"><History/><strong>لا توجد حركات بعد</strong><span>ابدأ بإضافة رصيد أو تسجيل مصروف أو شراء أصل.</span></div> : state.ledger.map(tx => {
      const gain = tx.realizedGainLossSar
      const category = tx.expenseCategoryId ? (state.expenseCategories ?? []).find(c => c.id === tx.expenseCategoryId) : undefined
      const portfolio = tx.portfolioId ? state.portfolios.find(p => p.id === tx.portfolioId) : undefined
      const beneficiary = tx.expenseBeneficiaryId ? (state.expenseBeneficiaries ?? []).find(b => b.id === tx.expenseBeneficiaryId) : undefined
      return <article className="ledger-event-card" key={tx.id}><div className={`ledger-event-icon ${tx.kind}`}>{kindIcon(tx.kind)}</div><div className="ledger-event-body"><div className="ledger-event-top"><div><span>{new Date(tx.at).toLocaleDateString('ar-SA')} • v{tx.version}</span><strong>{tx.title}</strong></div><strong className="ledger-event-amount">{money.format(tx.amountSar)} <small>ر.س</small></strong></div>{tx.note && <p>{tx.note}</p>}<div className="ledger-event-foot"><span className={`type-chip ${tx.kind}`}>{kindName(tx.kind)}</span>{category && <span className="realized-chip"><FolderTree size={12}/> {category.name}</span>}{beneficiary && <span className="realized-chip"><UserRound size={12}/> {beneficiary.name}</span>}{tx.expenseNecessity && <span className={`realized-chip necessity-${tx.expenseNecessity}`}>{necessityLabels[tx.expenseNecessity]}</span>}{portfolio && <span className="realized-chip"><Boxes size={12}/> {portfolio.name}</span>}{(tx.kind === 'conversion' || tx.kind === 'asset_sale') && gain != null && <span className={gain >= 0 ? 'profit realized-chip' : 'loss realized-chip'}>محقق {gain >= 0 ? '+' : ''}{money.format(gain)} ر.س</span>}{tx.revisions.length > 0 && <span className="realized-chip">{tx.revisions.length} مراجعة</span>}</div></div></article>
    })}</section>
  </div>
}

function kindIcon(kind: string): ReactNode { const icons: Record<string, ReactNode> = { opening: <WalletCards size={18}/>, income: <ArrowDownLeft size={18}/>, expense: <ArrowUpRight size={18}/>, real_transfer: <ArrowLeftRight size={18}/>, asset_purchase: <ArrowUpRight size={18}/>, asset_sale: <ArrowDownLeft size={18}/>, conversion: <Repeat2 size={18}/>, allocation_settlement: <SlidersHorizontal size={18}/>, ownership_event: <SlidersHorizontal size={18}/>, liability_creation: <ArrowUpRight size={18}/>, liability_payment: <ArrowDownLeft size={18}/>, reconciliation: <RefreshCcw size={18}/>, refund: <RefreshCcw size={18}/> }; return icons[kind] ?? <RefreshCcw size={18}/> }
function kindName(kind: string) { return ({ opening: 'افتتاحي', income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', asset_purchase: 'شراء أصل', asset_sale: 'بيع أصل', conversion: 'تحويل أصل', allocation_settlement: 'تسوية محفظة', ownership_event: 'ملكية/دين', liability_creation: 'إنشاء التزام', liability_payment: 'سداد التزام', reconciliation: 'مطابقة', refund: 'استرداد' } as Record<string, string>)[kind] ?? kind }
