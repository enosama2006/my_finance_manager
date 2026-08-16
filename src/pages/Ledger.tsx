import { LockKeyhole } from 'lucide-react'
import { useFinance } from '../application/store'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

export function Ledger() {
  const { state } = useFinance()
  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">IMMUTABLE EVENT HISTORY</span><h2>السجل المالي</h2><p>العمليات المنشورة لا تُنقل بين الحسابات. التصحيح يتم بحدث جديد، لا بتغيير التاريخ.</p></div><div className="lock-note"><LockKeyhole size={18} /> سجل غير قابل للنقل</div></section>
    <section className="ledger-table-wrap">
      <table className="ledger-table">
        <thead><tr><th>التاريخ</th><th>العملية</th><th>النوع</th><th>القيمة</th><th>الربح/الخسارة المحققة</th></tr></thead>
        <tbody>{state.ledger.map(tx => <tr key={tx.id}>
          <td>{new Date(tx.at).toLocaleDateString('ar-SA')}</td>
          <td><strong>{tx.title}</strong><small>{tx.note}</small></td>
          <td><span className={`type-chip ${tx.kind}`}>{kindName(tx.kind)}</span></td>
          <td>{money.format(tx.amountSar)} ر.س</td>
          <td className={(tx.realizedGainLossSar ?? 0) >= 0 ? 'profit' : 'loss'}>{tx.kind === 'conversion' ? `${money.format(tx.realizedGainLossSar ?? 0)} ر.س` : '—'}</td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>
}

function kindName(kind: string) {
  return ({ income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', reallocation: 'إعادة تخصيص', conversion: 'تحويل أصل', reconciliation: 'تسوية' } as Record<string, string>)[kind] ?? kind
}
