import { Building2, CirclePlus, Landmark, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import type { Party } from '../domain/types'

const partyTypes: { value: Party['type']; label: string }[] = [
  { value: 'bank', label: 'بنك / مصرف' },
  { value: 'broker', label: 'منصة / وسيط استثماري' },
  { value: 'institution', label: 'مؤسسة / جهة أخرى' },
  { value: 'person', label: 'شخص' },
]

export function Parties() {
  const finance = useFinance()
  const [name, setName] = useState('')
  const [type, setType] = useState<Party['type']>('bank')
  const [message, setMessage] = useState<string | null>(null)
  const parties = finance.state.parties.filter(p => p.type !== 'self')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      finance.createParty({ name, type })
      setName('')
      setMessage('تمت إضافة الجهة. أصبحت متاحة الآن عند إنشاء الحسابات والحفظ.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إضافة الجهة')
    }
  }

  return <div className="page-stack">
    <section className="section-intro">
      <div><span className="eyebrow">PARTIES / CUSTODIANS</span><h2>الجهات والبنوك</h2><p>أنشئ البنك أو المنصة أو الشخص أولًا، ثم أنشئ الحساب أو الحاوية التابعة له. الجهة لا تحمل قيمة مالية بذاتها.</p></div>
    </section>
    <section className="expense-admin-grid">
      <div className="panel">
        <div className="panel-head"><div><span>إضافة جهة</span><h2>بنك، منصة أو شخص</h2></div><CirclePlus size={18} /></div>
        <form className="trade-form" onSubmit={submit}>
          <label><span>الاسم</span><input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مصرف الراجحي" /></label>
          <label><span>النوع</span><select value={type} onChange={e => setType(e.target.value as Party['type'])}>{partyTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <button className="primary wide" type="submit">إضافة الجهة</button>
        </form>
        {message && <div className="operation-message ok">{message}</div>}
      </div>
      <div className="panel">
        <div className="panel-head"><div><span>الجهات المسجلة</span><h2>{parties.length ? `${parties.length} جهة` : 'لا توجد جهات بعد'}</h2></div><Landmark size={18} /></div>
        {parties.length === 0 ? <div className="empty-preview"><Building2 /><strong>ابدأ من الصفر</strong><span>أضف بنكك الأول أو منصتك الاستثمارية، ثم انتقل إلى «العمليات العامة» لإنشاء الحساب.</span></div> : <div className="list-stack">{parties.map(p => <div className="asset-row" key={p.id}><span className="asset-icon">{p.type === 'person' ? <UserRound size={17} /> : <Building2 size={17} />}</span><div className="grow"><strong>{p.name}</strong><span>{partyTypes.find(x => x.value === p.type)?.label ?? p.type}</span></div></div>)}</div>}
      </div>
    </section>
  </div>
}
