import { Activity, Boxes, ChartNoAxesCombined, CircleDollarSign, CirclePlus, Download, Gauge, ReceiptText, RotateCcw, Upload, WalletCards } from 'lucide-react'
import { useRef, type ChangeEvent, type ReactNode } from 'react'
import { useFinance } from '../application/store'
import { downloadSnapshot } from '../data/snapshot'
import { useToast } from './ToastProvider'

export type PageKey = 'dashboard' | 'assets' | 'allocations' | 'operations' | 'ledger' | 'trade' | 'lab'

const items: { id: PageKey; label: string; short: string; icon: typeof Gauge; mobile?: boolean }[] = [
  { id: 'dashboard', label: 'نظرة عامة', short: 'الرئيسية', icon: Gauge, mobile: true },
  { id: 'allocations', label: 'المحافظ', short: 'المحافظ', icon: Boxes, mobile: true },
  { id: 'operations', label: 'العمليات المالية', short: 'إضافة', icon: CirclePlus, mobile: true },
  { id: 'assets', label: 'الأصول والحسابات', short: 'الأصول', icon: WalletCards, mobile: true },
  { id: 'ledger', label: 'الحركات', short: 'الحركات', icon: ReceiptText, mobile: true },
  { id: 'trade', label: 'تحويل الأصول', short: 'تحويل', icon: ChartNoAxesCombined },
  { id: 'lab', label: 'مختبر السيناريوهات', short: 'المختبر', icon: Activity },
]

export function Shell({ page, onPage, onReset, children }: { page: PageKey; onPage: (p: PageKey) => void; onReset: () => void; children: ReactNode }) {
  const finance = useFinance()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const current = items.find((x) => x.id === page)
  const mobileItems = items.filter(x => x.mobile)

  const reset = () => {
    if (window.confirm('سيتم مسح جميع البيانات التي أدخلتها في هذه النسخة والعودة إلى تطبيق فارغ. هل تريد المتابعة؟')) {
      onReset()
      toast.success('تم مسح البيانات والعودة إلى بداية فارغة.')
    }
  }

  const exportData = () => {
    downloadSnapshot(finance.state)
    toast.success('تم تصدير نسخة MyFinMan بصيغة JSON. احتفظ بها أو أرسلها لي عند أي تحديث.')
  }

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!window.confirm('استيراد النسخة سيستبدل بيانات التطبيق الحالية بالكامل. هل تريد المتابعة؟')) return
    try {
      finance.importSnapshot(await file.text())
      toast.success('تم استيراد بيانات MyFinMan بنجاح.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد الملف')
    }
  }

  return <div className="app-stage"><div className="app-shell">
    <aside className="side-nav" aria-label="التنقل الرئيسي">
      <button className="side-brand" onClick={() => onPage('dashboard')}><span className="brand-mark"><CircleDollarSign size={23} /></span><span><b>MyFinMan</b><small>Personal Finance OS</small></span></button>
      <div className="side-nav-items">
        {items.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'side-nav-item active' : 'side-nav-item'} onClick={() => onPage(id)}><span className="side-nav-icon"><Icon size={20} /></span><span className="side-nav-label">{label}</span></button>)}
      </div>
      <div className="side-nav-footer"><span>OPERATING FOUNDATION</span><small>RTL • Responsive • Audit-first</small></div>
    </aside>

    <div className="app-main-column">
      <header className="app-header">
        <div className="header-brand-mobile"><div className="brand-mark"><CircleDollarSign size={22} /></div></div>
        <div className="header-context"><span className="eyebrow">MYFINMAN / OPERATING FOUNDATION</span><strong>{current?.label}</strong></div>
        <div className="header-actions">
          {page !== 'operations' && <button className="quick-action-button" onClick={() => onPage('operations')}><CirclePlus size={17} /><span>عملية جديدة</span></button>}
          <button className="icon-button data-button" onClick={exportData} aria-label="تصدير البيانات" title="تصدير بيانات MyFinMan"><Download size={18} /></button>
          <button className="icon-button data-button" onClick={() => fileRef.current?.click()} aria-label="استيراد البيانات" title="استيراد نسخة MyFinMan"><Upload size={18} /></button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
          <button className="icon-button" onClick={reset} aria-label="مسح البيانات والبدء من جديد" title="مسح البيانات والبدء من جديد"><RotateCcw size={18} /></button>
        </div>
      </header>
      <main className="main-area"><div className="content">{children}</div></main>
    </div>

    <nav className="bottom-nav" aria-label="التنقل الرئيسي على الجوال">
      {mobileItems.map(({ id, short, icon: Icon }) => <button key={id} className={page === id ? 'bottom-nav-item active' : 'bottom-nav-item'} onClick={() => onPage(id)}><span className="bottom-nav-icon"><Icon size={20} strokeWidth={page === id ? 2.5 : 2} /></span><span>{short}</span></button>)}
    </nav>
  </div></div>
}