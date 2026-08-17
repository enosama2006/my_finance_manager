import { Archive, ChevronDown, ChevronLeft, FolderTree, Pencil, Plus, WalletCards, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useReportingCurrency } from '../application/reportingCurrency'
import { useToast } from '../components/ToastProvider'
import { currencyCatalog, formatReportingValue } from '../domain/currencies'
import { holdingValueSar } from '../domain/finance'
import type { Account, AccountGroup, AccountKind } from '../domain/types'

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: 'checking', label: 'حساب جاري' },
  { value: 'saving', label: 'حساب ادخار' },
  { value: 'investment', label: 'حساب استثماري' },
  { value: 'cash_container', label: 'خزنة / نقد فعلي' },
  { value: 'custody', label: 'حفظ أصول' },
  { value: 'fixed_term', label: 'استثمار لأجل' },
  { value: 'prepaid', label: 'مسبق الدفع' },
  { value: 'credit_card', label: 'بطاقة ائتمان' },
]

function accountKindName(kind: AccountKind) { return accountKinds.find(x => x.value === kind)?.label ?? kind }

function descendants(all: AccountGroup[], id: string): Set<string> {
  const result = new Set<string>()
  const walk = (parentId: string) => all.filter(g => g.parentId === parentId).forEach(g => { if (!result.has(g.id)) { result.add(g.id); walk(g.id) } })
  walk(id); return result
}

export function AccountGroups() {
  const finance = useFinance()
  const toast = useToast()
  const [reportingCurrency] = useReportingCurrency()
  const active = (finance.state.accountGroups ?? []).filter(g => g.status === 'active')
  const activeAccounts = finance.state.accounts.filter(a => a.status === 'active')
  const roots = useMemo(() => active.filter(g => !g.parentId || !active.some(p => p.id === g.parentId)), [active])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(roots.map(r => r.id)))

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountGroup | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [description, setDescription] = useState('')

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountName, setAccountName] = useState('')
  const [accountKind, setAccountKind] = useState<AccountKind>('checking')
  const [accountCurrency, setAccountCurrency] = useState('SAR')
  const [accountLast4, setAccountLast4] = useState('')
  const [accountGroupId, setAccountGroupId] = useState('')

  const openNew = () => { setEditing(null); setName(''); setParentId(''); setDescription(''); setModalOpen(true) }
  const openEdit = (g: AccountGroup) => { setEditing(g); setName(g.name); setParentId(g.parentId ?? ''); setDescription(g.description ?? ''); setModalOpen(true) }
  const close = () => setModalOpen(false)
  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const openAccountEdit = (account: Account) => {
    setEditingAccount(account)
    setAccountName(account.name)
    setAccountKind(account.kind)
    setAccountCurrency(account.currency ?? 'SAR')
    setAccountLast4(account.last4 ?? '')
    setAccountGroupId(account.groupId ?? '')
    setAccountModalOpen(true)
  }
  const closeAccountEdit = () => { setAccountModalOpen(false); setEditingAccount(null) }

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

  const submitAccount = (e: FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return
    try {
      finance.updateAccount({
        id: editingAccount.id,
        name: accountName,
        kind: accountKind,
        currency: accountCurrency || undefined,
        last4: accountLast4 || undefined,
        groupId: accountGroupId || undefined,
      })
      toast.success(`تم تحديث الحساب «${accountName.trim()}» مع الحفاظ على كل الأرصدة والحركات التاريخية.`)
      closeAccountEdit()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الحساب') }
  }

  const archive = (g: AccountGroup) => {
    if (!window.confirm(`أرشفة مجموعة «${g.name}»؟ يجب أن تكون خالية من الحسابات والفروع النشطة.`)) return
    try { finance.archiveAccountGroup(g.id); toast.success(`تمت أرشفة «${g.name}».`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر أرشفة المجموعة') }
  }

  const move = (account: Account, groupId: string) => {
    try {
      finance.moveAccountToGroup(account.id, groupId || undefined)
      const groupName = active.find(g => g.id === groupId)?.name ?? 'بدون مجموعة'
      toast.success(`تم نقل «${account.name}» تنظيميًا إلى «${groupName}». لم تحدث حركة مالية.`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر نقل الحساب') }
  }

  const ungrouped = activeAccounts.filter(a => !a.groupId || !active.some(g => g.id === a.groupId))

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">GROUP → ACCOUNT → HOLDING</span><h2>مجموعات الحسابات</h2><p>المجموعة مجلد تنظيمي حر فقط. أنشئ «البنوك»، «الاستثمارات»، «المنزل» أو أي تنظيم يناسبك، ثم ضع الحسابات تحتها. يمكنك تعديل بيانات الحساب من زر القلم دون المساس بالحيازات أو التاريخ المالي.</p></div><button className="primary" onClick={openNew}><Plus size={16}/> مجموعة جديدة</button></section>

    {ungrouped.length > 0 && <section className="panel"><div className="panel-head"><div><span>حسابات من الجذر</span><h2>بدون مجموعة</h2><span>يمكن أن تبقى هكذا أو تنقلها لأي مجموعة.</span></div><WalletCards size={18}/></div><div className="account-organizer-list">{ungrouped.map(account => <AccountOrganizerRow key={account.id} account={account} groups={active} state={finance.state} reportingCurrency={reportingCurrency} onMove={move} onEdit={openAccountEdit}/>)}</div></section>}

    <section className="panel category-tree-panel">
      <div className="panel-head"><div><span>شجرتك التنظيمية</span><h2>{active.length ? `${active.length} مجموعة` : 'لا توجد مجموعات بعد'}</h2></div><FolderTree size={18}/></div>
      {roots.length === 0 ? <div className="empty-preview"><FolderTree/><strong>ابدأ بالطريقة التي تناسبك</strong><span>يمكنك إنشاء الحساب مباشرة بدون مجموعة، أو إنشاء مجموعة مثل «البنوك» ثم إضافة الحسابات إليها.</span></div> : <div className="category-tree">{roots.map(root => <GroupNode key={root.id} group={root} all={active} state={finance.state} reportingCurrency={reportingCurrency} depth={0} expanded={expanded} onToggle={toggle} onEdit={openEdit} onArchive={archive} onMove={move} onEditAccount={openAccountEdit}/>)}</div>}
    </section>

    {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="expense-modal category-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={close} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>{editing ? 'تعديل المجموعة' : 'مجموعة جديدة'}</span><h2>{editing ? `تعديل «${editing.name}»` : 'إنشاء مجموعة حسابات'}</h2><span>المجموعة لا تملك رصيدًا بذاتها؛ الرقم الظاهر لها هو مجموع الحسابات تحتها.</span></div></div><form className="trade-form" onSubmit={submit}>
      <label><span>اسم المجموعة</span><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="البنوك / الاستثمارات / المنزل" /></label>
      <label><span>المجموعة الأب</span><select value={parentId} onChange={e => setParentId(e.target.value)}><option value="">من الجذر</option>{active.filter(g => g.id !== editing?.id && !(editing && descendants(active, editing.id).has(g.id))).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label><span>وصف اختياري</span><input value={description} onChange={e => setDescription(e.target.value)} /></label>
      <button className="primary wide" type="submit">{editing ? 'حفظ التعديل' : 'إنشاء المجموعة'}</button>
    </form></section></div>}

    {accountModalOpen && editingAccount && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeAccountEdit() }}><section className="expense-modal category-modal" role="dialog" aria-modal="true" aria-label="تعديل الحساب"><button className="modal-close" onClick={closeAccountEdit} aria-label="إغلاق"><X size={18}/></button><div className="panel-head"><div><span>تعديل بيانات الحساب</span><h2>تعديل «{editingAccount.name}»</h2><span>التعديل يغيّر بيانات الحساب التنظيمية فقط. معرف الحساب والحيازات وCost Basis والـLedger تبقى كما هي.</span></div></div><form className="trade-form" onSubmit={submitAccount}>
      <div className="field-grid"><label><span>اسم الحساب</span><input autoFocus value={accountName} onChange={e => setAccountName(e.target.value)} /></label><label><span>نوع الحساب</span><select value={accountKind} onChange={e => setAccountKind(e.target.value as AccountKind)}>{accountKinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
      <div className="field-grid"><label><span>العملة الأساسية</span><select value={accountCurrency} onChange={e => setAccountCurrency(e.target.value)}>{currencyCatalog.map(item => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select></label><label><span>آخر 4 أرقام</span><input value={accountLast4} onChange={e => setAccountLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="اختياري" /></label></div>
      <label><span>المجموعة</span><select value={accountGroupId} onChange={e => setAccountGroupId(e.target.value)}><option value="">بدون مجموعة</option>{active.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><small>تغيير المجموعة تنظيمي فقط ولا يحرك المال.</small></label>
      <div className="operation-rule"><span>العملة الأساسية تصف الحساب وتساعد نماذج الإدخال؛ تغييرها لا يحوّل الأرصدة الموجودة ولا ينشئ حركة صرف.</span></div>
      <button className="primary wide" type="submit">حفظ تعديلات الحساب</button>
    </form></section></div>}
  </div>
}

function AccountOrganizerRow({ account, groups, state, reportingCurrency, onMove, onEdit }: { account: Account; groups: AccountGroup[]; state: ReturnType<typeof useFinance>['state']; reportingCurrency: string; onMove: (account: Account, groupId: string) => void; onEdit: (account: Account) => void }) {
  const holdings = state.holdings.filter(h => !h.archived && h.quantity > 0 && h.accountId === account.id)
  const value = holdings.reduce((sum, h) => sum + holdingValueSar(h), 0)
  return <div className="account-organizer-row"><div><WalletCards size={16}/><span><strong>{account.name}</strong><small>{accountKindName(account.kind)}{account.currency ? ` • ${account.currency}` : ''} • {holdings.length} أصول/أرصدة • {formatReportingValue(value, reportingCurrency)}</small></span></div><div className="account-organizer-actions"><select value={account.groupId ?? ''} onChange={e => onMove(account, e.target.value)}><option value="">بدون مجموعة</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="account-edit-button" title="تعديل الحساب" aria-label={`تعديل ${account.name}`} onClick={() => onEdit(account)}><Pencil size={14}/></button></div></div>
}

function GroupNode({ group, all, state, reportingCurrency, depth, expanded, onToggle, onEdit, onArchive, onMove, onEditAccount }: { group: AccountGroup; all: AccountGroup[]; state: ReturnType<typeof useFinance>['state']; reportingCurrency: string; depth: number; expanded: Set<string>; onToggle: (id: string) => void; onEdit: (g: AccountGroup) => void; onArchive: (g: AccountGroup) => void; onMove: (account: Account, groupId: string) => void; onEditAccount: (account: Account) => void }) {
  const children = all.filter(g => g.parentId === group.id)
  const descendantIds = new Set([group.id, ...descendants(all, group.id)])
  const accounts = state.accounts.filter(a => a.status === 'active' && a.groupId && descendantIds.has(a.groupId))
  const directAccounts = state.accounts.filter(a => a.status === 'active' && a.groupId === group.id)
  const value = state.holdings.filter(h => !h.archived && h.quantity > 0 && accounts.some(a => a.id === h.accountId)).reduce((sum, h) => sum + holdingValueSar(h), 0)
  const open = expanded.has(group.id)
  return <div className="category-node-wrap"><div className="category-node" style={{ '--tree-depth': depth } as CSSProperties}><button className="category-branch" onClick={() => (children.length || directAccounts.length) && onToggle(group.id)}>{children.length || directAccounts.length ? (open ? <ChevronDown size={14}/> : <ChevronLeft size={14}/>) : <span className="tree-leaf-dot"/>}</button><div className="category-node-main"><div><strong>{group.name}</strong><span>{directAccounts.length} حساب مباشر • {children.length} مجموعة فرعية</span></div></div><div className="category-node-spend"><span>إجمالي الأصول</span><strong>{formatReportingValue(value, reportingCurrency)}</strong></div><div className="category-node-actions"><button title="تعديل" onClick={() => onEdit(group)}><Pencil size={14}/></button><button title="أرشفة" onClick={() => onArchive(group)}><Archive size={14}/></button></div></div>{open && <div className="category-children">{directAccounts.map(account => <AccountOrganizerRow key={account.id} account={account} groups={all} state={state} reportingCurrency={reportingCurrency} onMove={onMove} onEdit={onEditAccount}/>)}{children.map(child => <GroupNode key={child.id} group={child} all={all} state={state} reportingCurrency={reportingCurrency} depth={depth + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onArchive={onArchive} onMove={onMove} onEditAccount={onEditAccount}/>)}</div>}</div>
}
