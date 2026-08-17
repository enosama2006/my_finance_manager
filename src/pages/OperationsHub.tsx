import { Building2, FolderTree, ReceiptText, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Operations } from './Operations'
import { ExpenseCategories } from './ExpenseCategories'
import { SpendExpense } from './SpendExpense'
import { Parties } from './Parties'

type Tab = 'general' | 'expense' | 'categories' | 'parties'

const tabs: { id: Tab; label: string; sub: string; icon: typeof SlidersHorizontal }[] = [
  { id: 'general', label: 'العمليات العامة', sub: 'حسابات، أرصدة، أصول، محافظ', icon: SlidersHorizontal },
  { id: 'expense', label: 'تسجيل مصروف', sub: 'بند + حساب + محفظة اختيارية', icon: ReceiptText },
  { id: 'categories', label: 'بنود الصرف', sub: 'إدارة شجرية للتصنيفات', icon: FolderTree },
  { id: 'parties', label: 'الجهات والبنوك', sub: 'بنوك، منصات، أشخاص', icon: Building2 },
]

export function OperationsHub({ goTrade }: { goTrade: () => void }) {
  const [tab, setTab] = useState<Tab>('general')
  return <div className="page-stack operations-hub">
    <section className="operations-tabs" aria-label="أنواع العمليات">
      {tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'operations-tab active' : 'operations-tab'} onClick={() => setTab(item.id)}><Icon size={18} /><span><strong>{item.label}</strong><small>{item.sub}</small></span></button> })}
    </section>
    {tab === 'general' && <Operations goTrade={goTrade} />}
    {tab === 'expense' && <SpendExpense />}
    {tab === 'categories' && <ExpenseCategories />}
    {tab === 'parties' && <Parties />}
  </div>
}
