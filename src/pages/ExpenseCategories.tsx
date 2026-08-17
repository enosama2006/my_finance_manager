import { Archive, ChevronLeft, FolderTree, Pencil, Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { expenseCategorySpentSar } from '../application/expenses'
import { useToast } from '../components/ToastProvider'
import type { ExpenseCategory } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

function depthLabel(all: ExpenseCategory[], category: ExpenseCategory): string {
  const names: string[] = [category.name]
  let current = category
  const seen = new Set<string>()
  while (current.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId)
    const parent = all.find(c => c.id === current.parentId)
    if (!parent) break
    names.unshift(parent.name)
    current = parent
  }
  return names.join(' ← ')
}

export function ExpenseCategories() {
  const finance = useFinance()
  const toast = useToast()
  const all = finance.state.expenseCategories ?? []
  const active = all.filter(c => c.status === 'active')
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = editingId ? active.find(c => c.id === editingId) : undefined
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')

  const roots = useMemo(() => active.filter(c => !c.parentId || !active.some(p => p.id === c.parentId)), [active])

  const startEdit = (category: ExpenseCategory) => {
    setEditingId(category.id); setName(category.name); setParentId(category.parentId ?? ''); setDescription(category.description ?? '')
  }
  const clearForm = () => { setEditingId(null); setName(''); setParentId(''); setDescription('') }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      if (editingId) {
        finance.updateExpenseCategory({ id: editingId, name, parentId: parentId || undefined, description: description || undefined })
        toast.success('تم تحديث بند الصرف مع الحفاظ على الحركات التاريخية.')
      } else {
        finance.createExpenseCategory({ name, parentId: parentId || undefined, description: description || undefined })
        toast.success(`تم إنشاء بند الصرف «${name.trim()}» بنجاح.`)
      }
      clearForm()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ بند الصرف') }
  }

  const archive = (category: ExpenseCategory) => {
    if (!window.confirm(`أرشفة بند «${category.name}»؟ سيبقى ظاهرًا في التاريخ السابق ولا يمكن اختياره لمصروف جديد.`)) return
    try {
      finance.archiveExpenseCategory(category.id)
      if (editingId === category.id) clearForm()
      toast.success(`تمت أرشفة «${category.name}» مع الحفاظ على التاريخ.`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر أرشفة البند') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">EXPENSE TAXONOMY / WHAT</span><h2>بنود الصرف</h2><p>أنشئ شجرة التصنيف التي تناسبك: سكن ← خدمات ← كهرباء، أو سيارات ← وقود، أو صحة ← عيادات. بند الصرف يصف «على ماذا صُرف المال؟» ولا يحل محل المحفظة.</p></div></section>
    <section className="expense-admin-grid">
      <div className="panel category-editor"><div className="panel-head"><div><span>{editing ? 'تعديل بند موجود' : 'بند جديد'}</span><h2>{editing ? editing.name : 'إضافة إلى الشجرة'}</h2></div><Plus size={18} /></div><form className="trade-form" onSubmit={submit}><label><span>اسم البند</span><input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: كهرباء" /></label><label><span>البند الأب</span><select value={parentId} onChange={e => setParentId(e.target.value)}><option value="">بند رئيسي</option>{active.filter(c => c.id !== editingId).map(c => <option key={c.id} value={c.id}>{depthLabel(active, c)}</option>)}</select></label><label><span>وصف اختياري</span><input value={description} onChange={e => setDescription(e.target.value)} placeholder="ما الذي يدخل تحت هذا البند؟" /></label><div className="category-form-actions"><button className="primary" type="submit">{editing ? 'حفظ التعديل' : 'إضافة البند'}</button>{editing && <button className="ghost" type="button" onClick={clearForm}>إلغاء</button>}</div></form></div>
      <div className="panel category-tree-panel"><div className="panel-head"><div><span>الدليل الشجري</span><h2>{active.length ? `${active.length} بند نشط` : 'الشجرة فارغة'}</h2></div><FolderTree size={18} /></div>{roots.length === 0 ? <div className="empty-preview"><FolderTree /><strong>لا توجد بنود صرف</strong><span>ابدأ ببند رئيسي مثل «السكن» أو «السيارة»، ثم أضف تحته الفروع.</span></div> : <div className="category-tree">{roots.map(root => <CategoryNode key={root.id} category={root} all={active} state={finance.state} depth={0} onEdit={startEdit} onArchive={archive} />)}</div>}</div>
    </section>
  </div>
}

function CategoryNode({ category, all, state, depth, onEdit, onArchive }: { category: ExpenseCategory; all: ExpenseCategory[]; state: ReturnType<typeof useFinance>['state']; depth: number; onEdit: (c: ExpenseCategory) => void; onArchive: (c: ExpenseCategory) => void }) {
  const children = all.filter(c => c.parentId === category.id)
  const spent = expenseCategorySpentSar(state, category.id)
  return <div className="category-node-wrap"><div className="category-node" style={{ '--tree-depth': depth } as CSSProperties}><div className="category-node-main"><span className="category-branch"><ChevronLeft size={14} /></span><div><strong>{category.name}</strong><span>{category.description || (children.length ? `${children.length} فروع` : 'بند نهائي')}</span></div></div><div className="category-node-spend"><span>إجمالي الشجرة</span><strong>{money.format(spent)} ر.س</strong></div><div className="category-node-actions"><button title="تعديل" onClick={() => onEdit(category)}><Pencil size={14} /></button><button title="أرشفة" onClick={() => onArchive(category)}><Archive size={14} /></button></div></div>{children.length > 0 && <div className="category-children">{children.map(child => <CategoryNode key={child.id} category={child} all={all} state={state} depth={depth + 1} onEdit={onEdit} onArchive={onArchive} />)}</div>}</div>
}