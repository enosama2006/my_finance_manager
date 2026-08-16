import { Minus, Plus } from 'lucide-react'
import { useFinance } from '../application/store'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })

export function Allocations() {
  const { state, reallocate } = useFinance()
  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">LOGICAL ENVELOPES</span><h2>المخصصات لا تحرك المال الحقيقي</h2><p>تعديل التغطية هنا يغير الغرض فقط. لا ينشئ تحويلًا بين الحسابات ولا ربحًا أو خسارة.</p></div></section>
    <section className="cards-grid">
      {state.allocations.map(a => {
        const ratio = Math.min(100, Math.max(0, (a.fundedSar / a.amountSar) * 100))
        return <div className="allocation-card" key={a.id}>
          <div className="allocation-head"><div><span>{groupName(a.group)}</span><h3>{a.name}</h3></div><strong>{Math.round(ratio)}%</strong></div>
          <div className="progress"><span style={{ width: `${ratio}%` }} /></div>
          <div className="allocation-values"><div><span>مغطى</span><strong>{money.format(a.fundedSar)} ر.س</strong></div><div><span>الهدف</span><strong>{money.format(a.amountSar)} ر.س</strong></div></div>
          <div className="allocation-actions">
            <button onClick={() => reallocate(a.id, Math.max(0, a.fundedSar - 5000))}><Minus size={16} /> 5,000</button>
            <button onClick={() => reallocate(a.id, Math.min(a.amountSar, a.fundedSar + 5000))}><Plus size={16} /> 5,000</button>
          </div>
        </div>
      })}
    </section>
  </div>
}

function groupName(group: string) {
  return ({ essential: 'أساسي', monthly: 'شهري', emergency: 'طوارئ', saving: 'ادخار', investment: 'استثمار' } as Record<string, string>)[group] ?? group
}
