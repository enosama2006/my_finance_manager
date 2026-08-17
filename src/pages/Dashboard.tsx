import { ArrowLeft, BadgeDollarSign, Landmark, ShieldCheck, Sparkles, Vault } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFinance } from '../application/store'
import { availableByOwner, holdingsInThirdPartyCustody, netWorthByOwner, realizedProfitByOwner, totalAllocatedByOwner, ownerQuantity } from '../domain/finance'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })

export function Dashboard({ goAssets, goTrade }: { goAssets: () => void; goTrade: () => void }) {
  const { state } = useFinance()
  const net = netWorthByOwner(state, SELF_ID)
  const allocated = totalAllocatedByOwner(state, SELF_ID)
  const available = availableByOwner(state, SELF_ID)
  const profit = realizedProfitByOwner(state, SELF_ID)
  const external = holdingsInThirdPartyCustody(state, SELF_ID)
  const externalValue = external.reduce((sum, h) => sum + ownerQuantity(h, SELF_ID) * h.marketPriceSar, 0)
  const isEmpty = state.accounts.length === 0 && state.holdings.length === 0 && state.portfolios.length === 0 && state.ledger.length === 0

  return <div className="page-stack">
    <section className="hero-card"><div><span className="eyebrow">{isEmpty ? 'ابدأ ببناء صورتك المالية' : 'صافي الثروة بعد الالتزامات الخارجية'}</span><div className="hero-value">{money.format(net)} <small>ر.س</small></div><p>{isEmpty ? 'لا توجد بيانات تجريبية هنا. أضف الجهة أو البنك أولًا، ثم الحسابات والأرصدة والمحافظ وبنود الصرف والأصول بنفسك.' : 'المال حقيقة واحدة وله عدة خرائط: المالك، المحفظة، الأصل، والحساب/الحافظ. الأصول الموجودة لدى الغير تبقى ضمن ثروة مالكها.'}</p></div><div className="hero-actions"><button className="primary" onClick={goTrade}>{isEmpty ? 'ابدأ الإعداد' : 'عملية جديدة'} <ArrowLeft size={17} /></button><button className="secondary" onClick={goAssets}>تفصيل الأصول</button></div></section>
    <section className="metrics-grid">
      <Metric icon={<Vault />} label="غير مخصص" value={`${money.format(available)} ر.س`} hint="محسوب من حصص Holdings غير المرتبطة بمحفظة" />
      <Metric icon={<ShieldCheck />} label="داخل المحافظ" value={`${money.format(allocated)} ر.س`} hint="قيمة Portfolio Slices الفعلية" />
      <Metric icon={<Landmark />} label="أصولي لدى الغير" value={`${money.format(externalValue)} ر.س`} hint={`${external.length} حيازات خارجية`} />
      <Metric icon={<BadgeDollarSign />} label="ربح محقق" value={`${money.format(profit)} ر.س`} hint="من البيع/التحويل الحقيقي فقط" className={profit >= 0 ? 'positive' : 'negative'} />
    </section>
    <section className="split-grid">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">OWNERSHIP ≠ CUSTODY</span><h2>أصولي الموجودة عند غيري</h2></div><Sparkles size={20} /></div>{external.length === 0 ? <div className="empty-preview"><Landmark /><strong>لا توجد حيازات خارجية</strong><span>عندما تضيف أصلًا محفوظًا لدى جهة أخرى سيظهر هنا.</span></div> : <div className="list-stack">{external.map((h) => { const custodian = state.parties.find(p => p.id === h.custodianId)?.name ?? 'غير معروف'; const qty = ownerQuantity(h, SELF_ID); const account = state.accounts.find(a => a.id === h.accountId)?.name ?? 'حساب غير معروف'; return <div className="asset-row" key={h.id}><div className="asset-icon">{h.symbol.slice(0, 2)}</div><div className="grow"><strong>{h.name}</strong><span>{qty.toLocaleString('ar-SA')} {h.nativeUnit} • {custodian} • {account}</span></div><div className="amount">{money.format(qty * h.marketPriceSar)} <small>ر.س</small></div></div> })}</div>}</div>
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">LOGICAL TRANSACTIONS</span><h2>آخر الحركات</h2></div></div>{state.ledger.length === 0 ? <div className="empty-preview"><BadgeDollarSign /><strong>لا توجد حركات بعد</strong><span>ستظهر هنا الأرصدة والدخل والمصروفات والشراء والتحويلات التي تسجلها.</span></div> : <div className="timeline">{state.ledger.slice(0, 5).map(tx => <div className="timeline-row" key={tx.id}><span className={`dot ${tx.kind}`} /><div className="grow"><strong>{tx.title}</strong><span>{new Date(tx.at).toLocaleDateString('ar-SA')} • {labelKind(tx.kind)} • v{tx.version}</span></div><strong>{money.format(tx.amountSar)} ر.س</strong></div>)}</div>}</div>
    </section>
  </div>
}

function Metric({ icon, label, value, hint, className = '' }: { icon: ReactNode; label: string; value: string; hint: string; className?: string }) { return <div className={`metric-card ${className}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div> }
function labelKind(kind: string) { return ({ opening: 'افتتاحي', income: 'دخل', expense: 'مصروف', real_transfer: 'تحويل حقيقي', asset_purchase: 'شراء أصل', asset_sale: 'بيع أصل', conversion: 'تحويل أصل', allocation_settlement: 'تسوية محفظة', ownership_event: 'ملكية/دين', liability_creation: 'التزام', liability_payment: 'سداد التزام', reconciliation: 'مطابقة', refund: 'استرداد' } as Record<string, string>)[kind] ?? kind }
