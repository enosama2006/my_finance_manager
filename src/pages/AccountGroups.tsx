import { Archive, ChevronDown, ChevronLeft, FolderTree, Pencil, Plus, WalletCards, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useToast } from '../components/ToastProvider'
import { holdingValueSar } from '../domain/finance'
import type { AccountGroup } from '../domain/types'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

function descendants(all: AccountGroup[], id: string): Set<string> {
  const result = new Set<string>()
  const walk = (parentId: string) => all.filter(g => g.parentId === parentId).forEach(g => { if (!result.has(g.id)) { result.add(g.id); walk(g.id) } })
  walk(id); return result
}

export function AccountGroups() {
  const finance = useFinance()
  const toast = useToast()
  const active = (finance.state.accountGroups ?? []).filter(g => g.status === 'active')
  const roots = useMemo(() => active.filter(g => !g.parentId || !active.some(p => p.id === g.parentId)), [active])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(roots.map(r => r.id)))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountGroup | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')

  const openNew = () => { setEditing(null); setName(''); setParentId(''); setDescription(''); setModalOpen(true) }
  const openEdit = (g: AccountGroup) => { setEditing(g); setName(g.name); setParentId(g.parentId ?? ''); setDescription(g.description ?? ''); setModalOpen(true) }
  const close = () => setModalOpen(false)
  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        finance.updateAccountGroup({ id: editing.id, name, parentId: parentId || undefined, description: description || undefined })
        toast.success(`تم تحديث مجموعة «${name.trim()}». لم تتغير أي أرصدة أو حركات.`)
      } else {
        finance.createAccountGroup({ name, parentId: parentId || undefined, description: description || undefined })
        toast.success(`تم إنشاء مجموعة «${name.trim()}».`)
      }
      close()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ المجموعة') }
  }

  const archive = (g: AccountGroup) => {
    if (!window.confirm(`أرشفة مجموعة «${g.name}»؟ يجب أن تكون خالية من الحسابات والفروع النشطة.`)) return
    try { finance.archiveAccountGroup(g.id); toast.success(`تمت أرشفة «${g.name}».`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر أرشفة المجموعة') }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">GROUP → ACCOUNT → HOLDING</span><h2>مجموعات الحسابات</h2><p>المجموعة مجلد تنظيمي حر فقط. أنشئ «البنوك»، «الاستثمارات»، «المنزل» أو أي تنظيم يناسبك، ثم ضع الحسابات تحتها. نقل الحساب بين المجموعات لا ينفذ أي حركة مالية.</p></div><button className="primary" onClick={openNew}><Plus size={16}/> مجموعة جديدة</button></section>
    <section className="panel category-tree-panel">
      <div className="panel-head"><div><span>شجرتك التنظيمية</span><h2>{active.length ? `${active.length} مجموعة` : 'لا توجد مجموعات بعد'}</h2></div><FolderTree size={18}/></div>
      {roots.length === 0 ? <div className="empty-preview"><FolderTree/><strong>ابدأ بالطريقة التي تناسبك</strong><span>يمكنك إنشاء الحساب مباشرة بدون مجموعة، أو إنشاء مجموعة مثل «البنوك» ثم إضافة الحسابات إليها.</span></div> : <div className="category-tree">{roots.map(root => <GroupNode key={root.id} group={root} all={active} state={finance.state} depth={0} expanded={expanded} onToggle={toggle} onEdit={openEdit} onArchive={archive}/>)}</div>}
    </section>

    {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="expense-modal category-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={close} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>{editing ? 'تعديل المجموعة' : 'مجموعة جديدة'}</span><h2>{editing ? `تعديل «${editing.name}»` : 'إنشاء مجموعة حسابات'}</h2><span>المجموعة لا تملك رصيدًا بذاتها؛ الرقم الظاهر لها هو مجموع الحسابات تحتها.</span></div></div><form className="trade-form" onSubmit={submit}>
      <label><span>اسم المجموعة</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="البنوك / الاستثمارات / المنزل" /></label>
      <label><span>المجموعة الأب</span><select value={parentId} onChange={e => setParentId(e.target.value)}><option value="">من الجذر</option>{active.filter(g => g.id !== editing?.id && !(editing && descendants(active, editing.id).has(g.id))).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label><span>وصف اختياري</span><input value={description} onChange={e => setDescription(e.target.value)} /></label>
      <button className="primary wide" type="submit">{editing ? 'حفظ التعديل' : 'إنشاء المجموعة'}</button>
    </form></section></div>}
  </div>
}

function GroupNode({ group, all, state, depth, expanded, onToggle, onEdit, onArchive }: { group: AccountGroup; all: AccountGroup[]; state: ReturnType<typeof useFinance>['state']; depth: number; expanded: Set<string>; onToggle: (id: string) => void; onEdit: (g: AccountGroup) => void; onArchive: (g: AccountGroup) => void }) {
  const children = all.filter(g => g.parentId === group.id)
  const descendantIds = new Set([group.id, ...descendants(all, group.id)])
  const accounts = state.accounts.filter(a => a.status === 'active' && a.groupId && descendantIds.has(a.groupId))
  const directAccounts = state.accounts.filter(a => a.status === 'active' && a.groupId === group.id)
  const value = state.holdings.filter(h => !h.archived && h.quantity > 0 && accounts.some(a => a.id === h.accountId)).reduce((sum, h) => sum + holdingValueSar(h), 0)
  const open = expanded.has(group.id)
  return <div className="category-node-wrap"><div className="category-node" style={{ '--tree-depth': depth } as CSSProperties}><button className="category-branch" onClick={() => (children.length || directAccounts.length) && onToggle(group.id)}>{children.length || directAccounts.length ? (open ? <ChevronDown size={14}/> : <ChevronLeft size={14}/>) : <span className="tree-leaf-dot"/>}</button><div className="category-node-main"><div><strong>{group.name}</strong><span>{directAccounts.length} حساب مباشر • {children.length} مجموعة فرعية</span></div></div><div className="category-node-spend"><span>إجمالي الأصول</span><strong>{money.format(value)} ر.س</strong></div><div className="category-node-actions"><button title="تعديل" onClick={() => onEdit(group)}><Pencil size={14}/></button><button title="أرشفة" onClick={() => onArchive(group)}><Archive size={14}/></button></div></div>{open && <div className="category-children">{directAccounts.map(account => { const holdings = state.holdings.filter(h => !h.archived && h.quantity > 0 && h.accountId === account.id); const accountValue = holdings.reduce((sum, h) => sum + holdingValueSar(h), 0); return <div className="account-branch-head" key={account.id}><div><WalletCards size={16}/><span><strong>{account.name}</strong><small>{holdings.length} أصول/أرصدة</small></span></div><strong>{money.format(accountValue)} ر.س</strong></div> })}{children.map(child => <GroupNode key={child.id} group={child} all={all} state={state} depth={depth + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onArchive={onArchive}/>)}</div>}</div>
}
