import { ChartNoAxesCombined, CircleDollarSign, Gauge, ReceiptText, RotateCcw, WalletCards, Boxes } from 'lucide-react'
import type { ReactNode } from 'react'

export type PageKey = 'dashboard' | 'assets' | 'allocations' | 'ledger' | 'trade'

const items: { id: PageKey; label: string; short: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'نظرة عامة', short: 'الرئيسية', icon: Gauge },
  { id: 'allocations', label: 'المحافظ', short: 'المحافظ', icon: Boxes },
  { id: 'assets', label: 'الأصول والحسابات', short: 'الأصول', icon: WalletCards },
  { id: 'ledger', label: 'الحركات', short: 'الحركات', icon: ReceiptText },
  { id: 'trade', label: 'تحويل الأصول', short: 'تحويل', icon: ChartNoAxesCombined },
]

export function Shell({ page, onPage, onReset, children }: { page: PageKey; onPage: (p: PageKey) => void; onReset: () => void; children: ReactNode }) {
  const current = items.find((x) => x.id === page)
  return <div className="app-stage"><div className="app-shell">
    <header className="mobile-header">
      <div className="brand-lockup"><div className="brand-mark"><CircleDollarSign size={22} /></div><div><span className="eyebrow">MYFINMAN / FOUNDATION V4</span><strong>{current?.label}</strong></div></div>
      <button className="icon-button" onClick={onReset} aria-label="إعادة البيانات التجريبية" title="إعادة البيانات التجريبية"><RotateCcw size={18} /></button>
    </header>
    <main className="main-area"><div className="content">{children}</div></main>
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {items.map(({ id, short, icon: Icon }) => <button key={id} className={page === id ? 'bottom-nav-item active' : 'bottom-nav-item'} onClick={() => onPage(id)}><span className="bottom-nav-icon"><Icon size={20} strokeWidth={page === id ? 2.5 : 2} /></span><span>{short}</span></button>)}
    </nav>
  </div></div>
}
