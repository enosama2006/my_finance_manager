import { Archive, ChevronDown, ChevronLeft, ChevronsDownUp, ChevronsUpDown, FolderTree, Pencil, Plus, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { expenseCategorySpentSar } from '../application/expenses'
import { useToast } from '../components/ToastProvider'
import type { ExpenseCategory, ExpenseNecessity } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const necessityLabels: Record<ExpenseNecessity, string> = {
  obligation: 'التزام ملزم', essential: 'أساسي', flexible: 'مرن / قابل للضبط', discretionary: 'كمالي / اختياري',
}

function categoryPath(all: ExpenseCategory[], id?: string): ExpenseCategory[] {
  if (!id) return []
  const result: ExpenseCategory[] = []
  let current = all.find(c => c.id === id)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id); result.unshift(current)
    current = current.parentId ? all.find(c => c.id === current!.parentId) : undefined
  }
  return result
}
function descendants(all: ExpenseCategory[], id: string): Set<string> {
  const result = new Set<string>()
  const walk = (parentId: string) => all.filter(c => c.parentId === parentId).forEach(c => { if (!result.has(c.id)) { result.add(c.id); walk(c.id) } })
  walk(id); return result
}
function effectiveNecessity(all: ExpenseCategory[], category: ExpenseCategory): ExpenseNecessity | undefined {
  let current: ExpenseCategory | undefined = category
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    if (current.defaultNecessity) return current.defaultNecessity
    current = current.parentId ? all.find(c => c.id === current!.parentId) : undefined
  }
  return undefined
}

export function ExpenseCategories() {
  const finance = useFinance()
  const toast = useToast()
  const all = finance.state.expenseCategories ?? []
  const active = all.filter(c => c.status === 'active')
  const roots = useMemo(() => active.filter(c => !c.parentId || !active.some(p => p.id === c.parentId)), [active])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(roots.map(r => r.id)))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')
  const [necessity, setNecessity] = useState<ExpenseNecessity | ''>('')

  const openNew = () => { setEditing(null); setName(''); setParentId(''); setDescription(''); setNecessity(''); setModalOpen(true) }
  const openEdit = (category: ExpenseCategory) => { setEditing(category); setName(category.name); setParentId(category.parentId ?? ''); setDescription(category.description ?? ''); setNecessity(category.defaultNecessity ?? ''); setModalOpen(true) }
  const close = () => setModalOpen(false)
  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      if (editing) {
        finance.updateExpenseCategory({ id: editing.id, name, parentId: parentId || undefined, description: description || undefined, defaultNecessity: necessity || undefined })
        toast.success(`تم تحديث بند «${name.trim()}» مع الحفاظ على التاريخ.`)
      } else {
        finance.createExpenseCategory({ name, parentId: parentId || undefined, description: description || undefined, defaultNecessity: necessity || undefined })
        toast.success(`تم إنشاء بند الصرف «${name.trim()}».`)
      }
      close()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ بند الصرف') }
  }

  const archive = (category: ExpenseCategory) => {
    if (!window.confirm(`أرشفة بند «${category.name}»؟ سيبقى ظاهرًا في التاريخ السابق ولا يمكن اختياره لمصروف جديد.`)) return
    try { finance.archiveExpenseCategory(category.id); toast.success(`تمت أرشفة «${category.name}» مع الحفاظ على التاريخ.`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر أرشفة البند') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">EXPENSE TAXONOMY / WHAT</span><h2>بنود الصرف</h2><p>الشجرة تصف «على ماذا صُرف المال؟». درجة الضرورة المالية مستقلة عنها ويمكن توريثها من الأب، بينما المستفيد يُحدد عند تسجيل العملية لأن نفس البند قد يخدمك وحدك أو العائلة.</p></div><button className="primary" onClick={openNew}><Plus size={16}/> إضافة بند</button></section>
    <section className="panel category-tree-panel">
      <div className="panel-head"><div><span>الدليل الشجري</span><h2>{active.length ? `${active.length} بند نشط` : 'الشجرة فارغة'}</h2></div><div className="tree-toolbar"><button className="ghost small" onClick={() => setExpanded(new Set(roots.map(r => r.id)))}><ChevronsUpDown size={14}/> المستوى الأول</button><button className="ghost small" onClick={() => setExpanded(new Set())}><ChevronsDownUp size={14}/> طي الكل</button></div></div>
      {roots.length === 0 ? <div className="empty-preview"><FolderTree/><strong>لا توجد بنود صرف</strong><span>ابدأ ببند رئيسي مثل «السكن» أو «السيارة»، ثم أضف تحته الفروع.</span></div> : <div className="category-tree">{roots.map(root => <CategoryNode key={root.id} category={root} all={active} state={finance.state} depth={0} expanded={expanded} onToggle={toggle} onEdit={openEdit} onArchive={archive}/>)}</div>}
    </section>

    {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="expense-modal category-modal" role="dialog" aria-modal="true" aria-label={editing ? 'تعديل بند صرف' : 'إضافة بند صرف'}><button className="modal-close" onClick={close} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>{editing ? 'تعديل العقدة' : 'عقدة جديدة'}</span><h2>{editing ? `تعديل «${editing.name}»` : 'إضافة بند صرف'}</h2><span>لن تحتاج إلى التمرير لأعلى أو أسفل؛ التعديل يبقى فوق الشجرة التي كنت تعمل عليها.</span></div></div><form className="trade-form" onSubmit={submit}>
      <label><span>اسم البند</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="مثال: كهرباء" /></label>
      <ParentCascader all={active} selectedParentId={parentId} onChange={setParentId} blockedIds={editing ? new Set([editing.id, ...descendants(active, editing.id)]) : new Set()} />
      <label><span>درجة الضرورة الافتراضية</span><select value={necessity} onChange={e => setNecessity(e.target.value as ExpenseNecessity | '')}><option value="">توريث من الأب / غير مصنف</option><option value="obligation">التزام ملزم — عقد/فاتورة/استحقاق لا يمكن تركه</option><option value="essential">أساسي — حاجة أساسية مع بعض المرونة</option><option value="flexible">مرن — مهم أو مفيد لكن يمكن ضبط المبلغ/التوقيت</option><option value="discretionary">كمالي / اختياري — يمكن الاستغناء عنه دون ضرر أساسي</option></select><small>هذه قيمة افتراضية للبند. يمكن تغييرها لعملية صرف معينة دون تغيير البند.</small></label>
      <label><span>وصف اختياري</span><input value={description} onChange={e => setDescription(e.target.value)} placeholder="ما الذي يدخل تحت هذا البند؟" /></label>
      <button className="primary wide" type="submit">{editing ? 'حفظ التعديل' : 'إضافة البند'}</button>
    </form></section></div>}
  </div>
}

function ParentCascader({ all, selectedParentId, onChange, blockedIds }: { all: ExpenseCategory[]; selectedParentId: string; onChange: (id: string) => void; blockedIds: Set<string> }) {
  const eligible = all.filter(c => !blockedIds.has(c.id))
  const path = categoryPath(eligible, selectedParentId)
  const levels: ExpenseCategory[][] = []
  levels.push(eligible.filter(c => !c.parentId || !eligible.some(p => p.id === c.parentId)))
  path.forEach(node => { const children = eligible.filter(c => c.parentId === node.id); if (children.length) levels.push(children) })

  const choose = (level: number, value: string) => {
    if (!value) { const next = path.slice(0, level); onChange(next[next.length - 1]?.id ?? ''); return }
    const next = [...path.slice(0, level), eligible.find(c => c.id === value)!].filter(Boolean)
    onChange(next[next.length - 1]?.id ?? '')
  }

  return <div className="parent-cascader"><div className="cascader-label"><span>البند الأب</span><strong>{path.length ? path.map(c => c.name).join(' ← ') : 'بند رئيسي'}</strong></div><div className="cascader-levels">{levels.map((options, index) => <label key={index}><span>المستوى {index + 1}</span><select value={path[index]?.id ?? ''} onChange={e => choose(index, e.target.value)}><option value="">{index === 0 ? 'بدون أب — بند رئيسي' : 'اكتفِ بالمستوى السابق'}</option>{options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>)}</div></div>
}

function CategoryNode({ category, all, state, depth, expanded, onToggle, onEdit, onArchive }: { category: ExpenseCategory; all: ExpenseCategory[]; state: ReturnType<typeof useFinance>['state']; depth: number; expanded: Set<string>; onToggle: (id: string) => void; onEdit: (c: ExpenseCategory) => void; onArchive: (c: ExpenseCategory) => void }) {
  const children = all.filter(c => c.parentId === category.id)
  const spent = expenseCategorySpentSar(state, category.id)
  const open = expanded.has(category.id)
  const necessity = effectiveNecessity(all, category)
  return <div className="category-node-wrap"><div className="category-node" style={{ '--tree-depth': depth } as CSSProperties}><button className="category-branch" onClick={() => children.length && onToggle(category.id)} aria-label={open ? 'طي الفرع' : 'فتح الفرع'}>{children.length ? (open ? <ChevronDown size={14}/> : <ChevronLeft size={14}/>) : <span className="tree-leaf-dot"/>}</button><div className="category-node-main"><div><strong>{category.name}</strong><span>{category.description || (children.length ? `${children.length} فروع` : 'بند نهائي')}</span></div>{necessity && <span className={`necessity-badge ${necessity}`}>{necessityLabels[necessity]}{!category.defaultNecessity ? ' • موروث' : ''}</span>}</div><div className="category-node-spend"><span>إجمالي الشجرة</span><strong>{money.format(spent)} ر.س</strong></div><div className="category-node-actions"><button title="تعديل" onClick={() => onEdit(category)}><Pencil size={14}/></button><button title="أرشفة" onClick={() => onArchive(category)}><Archive size={14}/></button></div></div>{children.length > 0 && open && <div className="category-children">{children.map(child => <CategoryNode key={child.id} category={child} all={all} state={state} depth={depth + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onArchive={onArchive}/>)}</div>}</div>
}
