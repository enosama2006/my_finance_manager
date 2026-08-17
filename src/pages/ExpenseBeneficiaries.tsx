import { Archive, Pencil, Plus, UserRound, UsersRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import type { ExpenseBeneficiary, ExpenseBeneficiaryKind } from '../domain/types'

export function ExpenseBeneficiaries() {
  const finance = useFinance()
  const toast = useToast()
  const active = (finance.state.expenseBeneficiaries ?? []).filter(b => b.status === 'active')
  const [editing, setEditing] = useState<ExpenseBeneficiary | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ExpenseBeneficiaryKind>('person')
  const [description, setDescription] = useState('')

  const openNew = () => { setEditing(null); setName(''); setKind('person'); setDescription(''); setModalOpen(true) }
  const openEdit = (item: ExpenseBeneficiary) => { setEditing(item); setName(item.name); setKind(item.kind); setDescription(item.description ?? ''); setModalOpen(true) }
  const close = () => setModalOpen(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      if (editing) {
        finance.updateExpenseBeneficiary({ id: editing.id, name, kind, description: description || undefined })
        toast.success(`تم تحديث المستفيد «${name.trim()}».`)
      } else {
        finance.createExpenseBeneficiary({ name, kind, description: description || undefined })
        toast.success(`تمت إضافة المستفيد «${name.trim()}».`)
      }
      close()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ المستفيد') }
  }

  const archive = (item: ExpenseBeneficiary) => {
    if (!window.confirm(`أرشفة المستفيد «${item.name}»؟ ستبقى الحركات القديمة مرتبطة به.`)) return
    try { finance.archiveExpenseBeneficiary(item.id); toast.success(`تمت أرشفة «${item.name}».`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر أرشفة المستفيد') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">EXPENSE BENEFICIARY / WHO BENEFITED</span><h2>المستفيدون من الصرف</h2><p>المستفيد يجيب «لصالح من كان هذا المصروف؟». يمكن أن يكون فردًا مثل «أنا» أو «مراد»، أو مجموعة مثل «العائلة» أو «الأطفال». المجموعة تعامل كوحدة تقرير واحدة ولا نضاعف المبلغ تلقائيًا على أعضائها.</p></div><button className="primary" onClick={openNew}><Plus size={16}/> إضافة مستفيد</button></section>
    <section className="panel beneficiary-panel">
      {active.length === 0 ? <div className="empty-preview"><UsersRound/><strong>لا يوجد مستفيدون بعد</strong><span>أضف «أنا»، «العائلة»، «الأطفال» أو أسماء الأفراد التي تريد تتبع مصروفهم.</span></div> : <div className="beneficiary-grid">{active.map(item => <article className="beneficiary-card" key={item.id}><div className="beneficiary-main"><span className="beneficiary-icon">{item.kind === 'group' ? <UsersRound size={18}/> : <UserRound size={18}/>}</span><div><strong>{item.name}</strong><span>{item.kind === 'group' ? 'مجموعة' : 'فرد'}{item.description ? ` • ${item.description}` : ''}</span></div></div><div className="beneficiary-actions"><button onClick={() => openEdit(item)} title="تعديل"><Pencil size={14}/></button><button onClick={() => archive(item)} title="أرشفة"><Archive size={14}/></button></div></article>)}</div>}
    </section>
    {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="expense-modal" role="dialog" aria-modal="true" aria-label={editing ? 'تعديل مستفيد' : 'إضافة مستفيد'}><button className="modal-close" onClick={close} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>WHO</span><h2>{editing ? `تعديل ${editing.name}` : 'مستفيد جديد'}</h2></div></div><form className="trade-form" onSubmit={submit}><label><span>الاسم</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="مثال: العائلة / مراد / أنا" /></label><label><span>النوع</span><select value={kind} onChange={e => setKind(e.target.value as ExpenseBeneficiaryKind)}><option value="person">فرد</option><option value="group">مجموعة</option></select></label><label><span>وصف اختياري</span><input value={description} onChange={e => setDescription(e.target.value)} /></label><button className="primary wide" type="submit">{editing ? 'حفظ التعديل' : 'إضافة المستفيد'}</button></form></section></div>}
  </div>
}
