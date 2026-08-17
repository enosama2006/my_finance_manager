import { Building2, FolderTree, ReceiptText, SlidersHorizontal, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { OperationsV2 } from './OperationsV2'
import { ExpenseCategories } from './ExpenseCategories'
import { ExpenseBeneficiaries } from './ExpenseBeneficiaries'
import { SpendExpense } from './SpendExpense'
import { Parties } from './Parties'

type Tab = 'general' | 'expense' | 'categories' | 'beneficiaries' | 'parties'

const tabs: { id: Tab; label: string; sub: string; icon: typeof SlidersHorizontal }[] = [
  { id: 'general', label: 'العمليات العامة', sub: 'حسابات، أرصدة، أصول، محافظ', icon: SlidersHorizontal },
  { id: 'expense', label: 'تسجيل مصروف', sub: 'بند + مستفيد + حساب + محفظة', icon: ReceiptText },
  { id: 'categories', label: 'بنود الصرف', sub: 'شجرة + درجة ضرورة', icon: FolderTree },
  { id: 'beneficiaries', label: 'المستفيدون', sub: 'أنا، أفراد، عائلة، أطفال', icon: UsersRound },
  { id: 'parties', label: 'الأماكن والجهات', sub: 'بنك، منزل، منصة، مكان', icon: Building2 },
]

export function OperationsHub({ goTrade }: { goTrade: () => void }) {
  const [tab, setTab] = useState<Tab>('general')
  return <div className="page-stack operations-hub">
    <section className="operations-tabs" aria-label="أنواع العمليات">
      {tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'operations-tab active' : 'operations-tab'} onClick={() => setTab(item.id)}><Icon size={18}/><span><strong>{item.label}</strong><small>{item.sub}</small></span></button> })}
    </section>
    {tab === 'general' && <OperationsV2 goTrade={goTrade}/>} 
    {tab === 'expense' && <SpendExpense/>}
    {tab === 'categories' && <ExpenseCategories/>}
    {tab === 'beneficiaries' && <ExpenseBeneficiaries/>}
    {tab === 'parties' && <Parties/>}
  </div>
}
