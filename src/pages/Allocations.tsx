import { ChevronDown, ChevronLeft, Layers3, Target } from 'lucide-react'
import { useState } from 'react'
import { useFinance } from '../application/store'
import { portfolioDirectValueSar, portfolioRollupValueSar } from '../domain/finance'
import { portfolioCoverage } from '../domain/lifecycle'
import type { Portfolio } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

export function Allocations() {
  const { state } = useFinance()
  const roots = state.portfolios.filter(p => !p.parentId && p.status === 'active')
  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">PORTFOLIO ≠ POSITION ≠ CYCLE</span><h2>المحافظ كغرض وحوكمة</h2><p>المحفظة تجيب «لماذا؟». داخلها قد توجد مراكز أصول ودورات قصيرة أو طويلة. بيع أصل واحد لا يغلق المحفظة، والمساهمة الجديدة ليست ربحًا.</p></div></section>
    <section className="portfolio-tree">{roots.length === 0 ? <div className="empty-preview"><Layers3 /><strong>لا توجد محافظ بعد</strong><span>أنشئ أول محفظة من «العمليات المالية» ثم خصص لها نقدًا أو أصولًا.</span></div> : roots.map(root => <PortfolioNode key={root.id} portfolio={root} depth={0} />)}</section>
  </div>

  function PortfolioNode({ portfolio, depth }: { portfolio: Portfolio; depth: number }) {
    const children = state.portfolios.filter(p => p.parentId === portfolio.id && p.status === 'active')
    const [open, setOpen] = useState(true)
    const rollup = portfolioRollupValueSar(state, portfolio.id)
    const direct = portfolioDirectValueSar(state, portfolio.id)
    const target = portfolio.targetValueSar
    const spendingLike = portfolio.profile === 'commitment' || portfolio.profile === 'spending_budget'
    const coverage = spendingLike ? portfolioCoverage(state, portfolio.id) : null
    const ratioBase = coverage ? coverage.requiredSar : target
    const ratio = ratioBase ? Math.min(100, Math.max(0, rollup / ratioBase * 100)) : null
    const ownerNames = portfolio.ownerIds.map(id => state.parties.find(p => p.id === id)?.name ?? id).join('، ')
    const slices = state.portfolioSlices.filter(s => s.portfolioId === portfolio.id)
    const portfolioPositions = (state.positions ?? []).filter(p => p.portfolioId === portfolio.id)
    const portfolioCycles = (state.capitalCycles ?? []).filter(c => c.portfolioId === portfolio.id)
    return <article className={`portfolio-node depth-${Math.min(depth, 3)}`}>
      <button className="portfolio-node-head" onClick={() => setOpen(!open)}>
        <div className="tree-title"><div className="tree-avatar"><Layers3 size={18} /></div><div><strong>{portfolio.name}</strong><span>المالك: {ownerNames}{portfolio.profile ? ` • ${profileName(portfolio.profile)}` : ''}{portfolio.beneficiaryId ? ` • مستفيد: ${state.parties.find(p => p.id === portfolio.beneficiaryId)?.name}` : ''}</span></div></div>
        <div className="tree-summary"><strong>{money.format(rollup)} ر.س</strong>{children.length || slices.length ? (open ? <ChevronDown size={18} /> : <ChevronLeft size={18} />) : null}</div>
      </button>
      {target != null && <div className="portfolio-progress"><div><span><Target size={13} /> {coverage ? `الهدف ${money.format(coverage.originalTargetSar)} • صُرف ${money.format(coverage.spentSar)} • المتبقي ${money.format(coverage.requiredSar)} ر.س` : `الهدف/المطلوب ${money.format(target)} ر.س`}</span><strong>{Math.round(ratio ?? 0)}%</strong></div><div className="progress"><span style={{ width: `${ratio ?? 0}%` }} /></div></div>}
      {coverage && <div className="portfolio-direct"><span>الرصيد المخصص {money.format(coverage.economicCoverageSar)} ر.س • الجاهز نقديًا {money.format(coverage.settlementReadySar)} ر.س</span><strong>{coverage.requiredSar <= 0 ? 'مكتمل' : `${Math.round(coverage.settlementReadyPct)}% جاهز`}</strong></div>}
      {open && <div className="portfolio-node-body">
        {(portfolioPositions.length > 0 || portfolioCycles.length > 0) && <div className="portfolio-direct"><span>{portfolioPositions.filter(p => p.status !== 'closed').length} مراكز مفتوحة • {portfolioPositions.filter(p => p.status === 'closed').length} مغلقة</span><strong>{portfolioCycles.filter(c => c.status !== 'closed').length} دورات نشطة</strong></div>}
        {direct > 0 && <div className="portfolio-direct"><span>حيازات مباشرة</span><strong>{money.format(direct)} ر.س</strong></div>}
        {slices.map(slice => { const h = state.holdings.find(x => x.id === slice.holdingId); const account = h ? state.accounts.find(a => a.id === h.accountId) : null; return h && !h.archived && slice.quantity > 0 ? <div className="asset-row" key={slice.id}><div className="asset-icon">{h.symbol.slice(0, 2)}</div><div className="grow"><strong>{h.name}</strong><span>{slice.quantity.toLocaleString('ar-SA')} {h.nativeUnit} • {account?.name ?? 'حساب غير معروف'}</span></div><div className="amount">{money.format(slice.quantity * h.marketPriceSar)} <small>ر.س</small></div></div> : null })}
        {portfolioCycles.map(c => <div className="asset-row" key={c.id}><div className="asset-icon">د</div><div className="grow"><strong>{c.name}</strong><span>{c.status === 'closed' ? 'دورة مغلقة — النتيجة مثبتة' : `دورة مفتوحة • التزام ${money.format(c.openObligationSar)} ر.س`}</span></div><div className="amount">{c.status === 'closed' ? `${money.format(c.reportingResultSar ?? c.realizedGainsSar - c.realizedLossesSar - c.directCostsSar)} ر.س` : 'نشطة'}</div></div>)}
        {children.map(child => <PortfolioNode key={child.id} portfolio={child} depth={depth + 1} />)}
      </div>}
    </article>
  }
}

function profileName(profile: string) { return ({ spending_budget: 'ميزانية إنفاق', commitment: 'التزام', savings_goal: 'ادخار/هدف', reserve: 'احتياطي', investment: 'استثمار', deal: 'عملية' } as Record<string, string>)[profile] ?? profile }
