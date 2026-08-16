import { ArrowLeft, BadgeDollarSign, Landmark, ShieldCheck, Sparkles, Vault } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFinance } from '../application/store'
import { availableByOwner, holdingsInThirdPartyCustody, netWorthByOwner, realizedProfitByOwner, totalAllocatedByOwner } from '../domain/finance'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })

export function Dashboard({ goAssets, goTrade }: { goAssets: () => void; goTrade: () => void }) {
  const { state } = useFinance()
  const net = netWorthByOwner(state, SELF_ID)
  const allocated = totalAllocatedByOwner(state, SELF_ID)
  const available = availableByOwner(state, SELF_ID)
  const profit = realizedProfitByOwner(state, SELF_ID)
  const external = holdingsInThirdPartyCustody(state, SELF_ID)
  const externalValue = external.reduce((sum, h) => sum + (h.ownership.find(s => s.ownerId === SELF_ID)?.quantity ?? 0) * h.marketPriceSar, 0)

  return <div className="page-stack">
    <section className="hero-card">
      <div>
        <span className="eyebrow">صافي ما أملكه</span>
        <div className="hero-value">{money.format(net)} <small>ر.س</small></div>
        <p>الملكية مستقلة عن مكان الحفظ. لذلك تشمل هذه القيمة أصولك الموجودة عند البنوك والأشخاص الآخرين.</p>
      </div>
      <div className="hero-actions">
        <button className="primary" onClick={goTrade}>تحويل أصل <ArrowLeft size={17} /></button>
        <button className="secondary" onClick={goAssets}>تفصيل الملكية</button>
      </div>
    </section>

    <section className="metrics-grid">
      <Metric icon={<Vault />} label="غير مخصص" value={`${money.format(available)} ر.س`} hint="ليس الرصيد البنكي" />
      <Metric icon={<ShieldCheck />} label="المخصص حاليًا" value={`${money.format(allocated)} ر.س`} hint="أغراض منطقية بلا نقل نقدي" />
      <Metric icon={<Landmark />} label="أصولي لدى الغير" value={`${money.format(externalValue)} ر.س`} hint={`${external.length} حيازات خارجية`} />
      <Metric icon={<BadgeDollarSign />} label="ربح محقق" value={`${money.format(profit)} ر.س`} hint="من التحويلات فقط" className={profit >= 0 ? 'positive' : 'negative'} />
    </section>

    <section className="split-grid">
      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">OWNERSHIP ≠ CUSTODY</span><h2>أصولي الموجودة عند غيري</h2></div><Sparkles size={20} /></div>
        <div className="list-stack">
          {external.map((h) => {
            const custodian = state.parties.find(p => p.id === h.custodianId)?.name ?? 'غير معروف'
            const qty = h.ownership.find(s => s.ownerId === SELF_ID)?.quantity ?? 0
            return <div className="asset-row" key={h.id}>
              <div className="asset-icon">{h.symbol.slice(0, 2)}</div>
              <div className="grow"><strong>{h.name}</strong><span>{qty.toLocaleString('ar-SA')} {h.nativeUnit} • الحائز: {custodian}</span></div>
              <div className="amount">{money.format(qty * h.marketPriceSar)} <small>ر.س</small></div>
            </div>
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">IMMUTABLE LEDGER</span><h2>آخر الأحداث</h2></div></div>
        <div className="timeline">
          {state.ledger.slice(0, 5).map(tx => <div className="timeline-row" key={tx.id}>
            <span className={`dot ${tx.kind}`} />
            <div className="grow"><strong>{tx.title}</strong><span>{new Date(tx.at).toLocaleDateString('ar-SA')} • {labelKind(tx.kind)}</span></div>
            <strong>{money.format(tx.amountSar)} ر.س</strong>
          </div>)}
        </div>
      </div>
    </section>
  </div>
}

function Metric({ icon, label, value, hint, className = '' }: { icon: ReactNode; label: string; value: string; hint: string; className?: string }) {
  return <div className={`metric-card ${className}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
}

function labelKind(kind: string) {
  return ({ income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', reallocation: 'إعادة تخصيص', conversion: 'تحويل أصل', reconciliation: 'تسوية' } as Record<string, string>)[kind] ?? kind
}
