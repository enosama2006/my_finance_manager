import { Banknote, Boxes, ChartNoAxesCombined, CircleDollarSign, Gauge, Menu, ReceiptText, RotateCcw, WalletCards, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export type PageKey = 'dashboard' | 'assets' | 'allocations' | 'ledger' | 'trade'

const items: { id: PageKey; label: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'نظرة عامة', icon: Gauge },
  { id: 'assets', label: 'الأصول والحسابات', icon: WalletCards },
  { id: 'allocations', label: 'المخصصات', icon: Boxes },
  { id: 'ledger', label: 'السجل المالي', icon: ReceiptText },
  { id: 'trade', label: 'تحويل الأصول', icon: ChartNoAxesCombined },
]

export function Shell({ page, onPage, onReset, children }: { page: PageKey; onPage: (p: PageKey) => void; onReset: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><CircleDollarSign size={24} /></div>
          <div><strong>MyFinMan</strong><span>مديرك المالي الشخصي</span></div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={20} /></button>
        </div>
        <nav>
          {items.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => { onPage(id); setOpen(false) }}>
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-note"><Banknote size={17} /><div><strong>بيانات تجريبية محلية</strong><span>تحفظ في متصفحك فقط.</span></div></div>
          <button className="ghost wide" onClick={onReset}><RotateCcw size={16} /> إعادة البيانات التجريبية</button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="القائمة"><Menu size={20} /></button>
          <div><span className="eyebrow">MYFINMAN / CYCLE 1</span><h1>{items.find((x) => x.id === page)?.label}</h1></div>
          <div className="live-pill"><span /> دفتر محلي نشط</div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
