import { Building2, CirclePlus, Home, Landmark, MapPinned, UserRound, WalletCards } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import type { Party } from '../domain/types'

const partyTypes: { value: Party['type']; label: string }[] = [
  { value: 'bank', label: 'بنك / مصرف' },
  { value: 'broker', label: 'منصة / وسيط استثماري' },
  { value: 'home', label: 'منزل / خزنة شخصية' },
  { value: 'place', label: 'مكان فعلي آخر' },
  { value: 'institution', label: 'مؤسسة / جهة أخرى' },
  { value: 'person', label: 'شخص / حافظ لدى الغير' },
]

export function Parties() {
  const finance = useFinance()
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<Party['type']>('bank')
  const parties = finance.state.parties.filter(p => p.type !== 'self')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      finance.createParty({ name, type })
      const savedName = name.trim()
      setName('')
      toast.success(`تمت إضافة «${savedName}» بنجاح. يمكنك الآن إنشاء عدة حسابات أو حاويات تحته.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إضافة المكان/الجهة')
    }
  }

  return <div className="page-stack">
    <section className="section-intro">
      <div><span className="eyebrow">PLACE / INSTITUTION → ACCOUNTS → ASSETS</span><h2>الأماكن والجهات</h2><p>هذا هو الجذر الواضح للحفظ: مصرف الراجحي، المنزل، منصة استثمار، أو مكان فعلي. تحت كل مكان تنشئ عدة حسابات/حاويات، وتحت الحسابات توجد الأصول. المكان نفسه لا يُحسب كأصل.</p></div>
    </section>
    <section className="expense-admin-grid">
      <div className="panel">
        <div className="panel-head"><div><span>إضافة مكان أو جهة</span><h2>أين تُحفظ أصولك؟</h2></div><CirclePlus size={18} /></div>
        <form className="trade-form" onSubmit={submit}>
          <label><span>الاسم الواضح</span><input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مصرف الراجحي / المنزل / Binance" /></label>
          <label><span>النوع</span><select value={type} onChange={e => setType(e.target.value as Party['type'])}>{partyTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <button className="primary wide" type="submit">إضافة المكان</button>
        </form>
      </div>
      <div className="panel">
        <div className="panel-head"><div><span>الأماكن المسجلة</span><h2>{parties.length ? `${parties.length} مكان/جهة` : 'لا توجد أماكن بعد'}</h2></div><Landmark size={18} /></div>
        {parties.length === 0 ? <div className="empty-preview"><Building2 /><strong>ابدأ بمكان الحفظ الأول</strong><span>مثل «مصرف الراجحي» أو «المنزل». بعدها أنشئ الحسابات التابعة له.</span></div> : <div className="place-list">{parties.map(p => <PlaceCard key={p.id} party={p} />)}</div>}
      </div>
    </section>
  </div>

  function PlaceCard({ party }: { party: Party }) {
    const accounts = finance.state.accounts.filter(a => a.custodianId === party.id && a.status === 'active')
    return <article className="place-card">
      <div className="place-card-head"><span className="asset-icon">{party.type === 'home' ? <Home size={17} /> : party.type === 'person' ? <UserRound size={17} /> : party.type === 'place' ? <MapPinned size={17} /> : <Building2 size={17} />}</span><div className="grow"><strong>{party.name}</strong><span>{partyTypes.find(x => x.value === party.type)?.label ?? party.type} • {accounts.length} حساب/حاوية</span></div></div>
      {accounts.length > 0 ? <div className="place-account-list">{accounts.map(account => <div className="place-account-row" key={account.id}><WalletCards size={15} /><span>{account.name}</span><small>{account.currency || accountKindName(account.kind)}</small></div>)}</div> : <div className="place-empty-accounts">لا توجد حسابات بعد — أنشئ أول حساب من «العمليات العامة».</div>}
    </article>
  }
}

function accountKindName(kind: string) {
  return ({ checking: 'جاري', saving: 'ادخار', investment: 'استثمار', cash_container: 'حاوية نقد', prepaid: 'مسبق الدفع', custody: 'حفظ أصل', fixed_term: 'لأجل', credit_card: 'بطاقة ائتمان' } as Record<string, string>)[kind] ?? kind
}
