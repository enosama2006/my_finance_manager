import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, LockKeyhole, RefreshCcw, Repeat2, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFinance } from '../application/store'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

export function Ledger() {
  const { state } = useFinance()
  return <div className="page-stack">
    <section className="section-intro">
      <div><span className="eyebrow">IMMUTABLE EVENT HISTORY</span><h2>السجل المالي</h2><p>كل حركة بطاقة مستقلة. العمليات المنشورة لا تُنقل بين الحسابات؛ التصحيح يتم بحدث جديد.</p></div>
      <div className="lock-note"><LockKeyhole size={16} /> سجل غير قابل للنقل</div>
    </section>

    <section className="ledger-feed">
      {state.ledger.map(tx => {
        const gain = tx.realizedGainLossSar ?? 0
        return <article className="ledger-event-card" key={tx.id}>
          <div className={`ledger-event-icon ${tx.kind}`}>{kindIcon(tx.kind)}</div>
          <div className="ledger-event-body">
            <div className="ledger-event-top">
              <div><span>{new Date(tx.at).toLocaleDateString('ar-SA')}</span><strong>{tx.title}</strong></div>
              <strong className="ledger-event-amount">{money.format(tx.amountSar)} <small>ر.س</small></strong>
            </div>
            {tx.note && <p>{tx.note}</p>}
            <div className="ledger-event-foot">
              <span className={`type-chip ${tx.kind}`}>{kindName(tx.kind)}</span>
              {tx.kind === 'conversion' && <span className={gain >= 0 ? 'profit realized-chip' : 'loss realized-chip'}>محقق {gain >= 0 ? '+' : ''}{money.format(gain)} ر.س</span>}
            </div>
          </div>
        </article>
      })}
    </section>
  </div>
}

function kindIcon(kind: string): ReactNode {
  const icons: Record<string, ReactNode> = {
    income: <ArrowDownLeft size={18} />,
    expense: <ArrowUpRight size={18} />,
    real_transfer: <ArrowLeftRight size={18} />,
    reallocation: <SlidersHorizontal size={18} />,
    conversion: <Repeat2 size={18} />,
    reconciliation: <RefreshCcw size={18} />,
  }
  return icons[kind] ?? <RefreshCcw size={18} />
}

function kindName(kind: string) {
  return ({ income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', reallocation: 'إعادة تخصيص', conversion: 'تحويل أصل', reconciliation: 'تسوية' } as Record<string, string>)[kind] ?? kind
}
