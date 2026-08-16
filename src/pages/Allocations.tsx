import { ChevronDown, ChevronLeft, Layers3, Target } from 'lucide-react'
import { useState } from 'react'
import { useFinance } from '../application/store'
import { portfolioDirectValueSar, portfolioRollupValueSar } from '../domain/finance'
import type { Portfolio } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 })

export function Allocations() {
  const { state } = useFinance()
  const roots = state.portfolios.filter(p => !p.parentId && p.status === 'active')
  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">UNIFIED PORTFOLIO TREE</span><h2>المحافظ والمخصصات كيان واحد</h2><p>المحفظة تجيب «لماذا ولأي غرض؟». يمكنها أن تمتد عبر عدة حسابات وأنواع أصول، بينما التخصيص لا يحرك المال الحقيقي.</p></div></section>
    <section className="portfolio-tree">{roots.map(root => <PortfolioNode key={root.id} portfolio={root} depth={0} />)}</section>
  </div>

  function PortfolioNode({ portfolio, depth }: { portfolio: Portfolio; depth: number }) {
    const children = state.portfolios.filter(p => p.parentId === portfolio.id && p.status === 'active')
    const [open, setOpen] = useState(true)
    const rollup = portfolioRollupValueSar(state, portfolio.id)
    const direct = portfolioDirectValueSar(state, portfolio.id)
    const target = portfolio.targetValueSar
    const ratio = target ? Math.min(100, Math.max(0, rollup / target * 100)) : null
    const ownerNames = portfolio.ownerIds.map(id => state.parties.find(p => p.id === id)?.name ?? id).join('، ')
    const slices = state.portfolioSlices.filter(s => s.portfolioId === portfolio.id)
    return <article className={`portfolio-node depth-${Math.min(depth, 3)}`}>
      <button className="portfolio-node-head" onClick={() => setOpen(!open)}>
        <div className="tree-title"><div className="tree-avatar"><Layers3 size={18} /></div><div><strong>{portfolio.name}</strong><span>المالك: {ownerNames}{portfolio.beneficiaryId ? ` • مستفيد: ${state.parties.find(p => p.id === portfolio.beneficiaryId)?.name}` : ''}</span></div></div>
        <div className="tree-summary"><strong>{money.format(rollup)} ر.س</strong>{children.length ? (open ? <ChevronDown size={18} /> : <ChevronLeft size={18} />) : null}</div>
      </button>
      {target != null && <div className="portfolio-progress"><div><span><Target size={13} /> الهدف {money.format(target)} ر.س</span><strong>{Math.round(ratio ?? 0)}%</strong></div><div className="progress"><span style={{ width: `${ratio ?? 0}%` }} /></div></div>}
      {open && <div className="portfolio-node-body">
        {direct > 0 && <div className="portfolio-direct"><span>حيازات مباشرة</span><strong>{money.format(direct)} ر.س</strong></div>}
        {slices.map(slice => { const h = state.holdings.find(x => x.id === slice.holdingId); const account = h ? state.accounts.find(a => a.id === h.accountId) : null; return h ? <div className="asset-row" key={slice.id}><div className="asset-icon">{h.symbol.slice(0, 2)}</div><div className="grow"><strong>{h.name}</strong><span>{slice.quantity.toLocaleString('ar-SA')} {h.nativeUnit} • {account?.name ?? 'حساب غير معروف'}</span></div><div className="amount">{money.format(slice.quantity * h.marketPriceSar)} <small>ر.س</small></div></div> : null })}
        {children.map(child => <PortfolioNode key={child.id} portfolio={child} depth={depth + 1} />)}
      </div>}
    </article>
  }
}
