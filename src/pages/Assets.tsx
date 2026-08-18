import { ChevronDown, ChevronLeft, Filter, Layers3, Pencil, RefreshCcw, RotateCcw, Trash2, UserRoundCheck, WalletCards, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useFinance } from '../application/store'
import { useReportingCurrency } from '../application/reportingCurrency'
import { GroupCascader } from '../components/GroupCascader'
import { useToast } from '../components/ToastProvider'
import { assetTypeById } from '../domain/assetCatalog'
import { currencyByCode, currencyCatalog, formatReportingValue, holdingUnitValueSar, reportingCurrencyCatalog } from '../domain/currencies'
import { assetGroupOf, ownerHoldingValueSar, ownerQuantity, ownerWeightedAverageCostSar } from '../domain/finance'
import { holdingUnrealizedGainLossSar, ownerHoldingCostBasisSar } from '../domain/lifecycle'
import { fetchMarketQuote } from '../data/marketData'
import { SELF_ID } from '../data/seed'
import type { AccountGroup, AccountKind, AssetGroup, AssetKind, Holding, Portfolio } from '../domain/types'
import '../reporting-currency.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 4 })
const num = (v: string) => Number(v.replace(/,/g, ''))
const familyOrder: AssetGroup[] = ['cash_and_equivalents', 'investments', 'real_estate', 'other']
const kindOrder: AssetKind[] = ['cash', 'metal', 'fund', 'stock', 'crypto', 'fixed_term', 'real_estate', 'vehicle', 'receivable', 'collectible', 'other']
const initiallyExpanded = new Set<string>(['all-assets', ...familyOrder.map(x => `family-${x}`), ...kindOrder.map(x => `kind-${x}`)])

const kindOptions: { value: AssetKind; label: string }[] = [
  { value:'cash', label:'نقد / حساب نقدي' }, { value:'metal', label:'معادن' }, { value:'stock', label:'أسهم' }, { value:'fund', label:'صناديق' }, { value:'crypto', label:'عملات رقمية' }, { value:'real_estate', label:'عقار' }, { value:'vehicle', label:'مركبة' }, { value:'fixed_term', label:'استثمار لأجل' }, { value:'receivable', label:'ذمة / مطالبة' }, { value:'collectible', label:'مقتنيات' }, { value:'other', label:'أصل آخر' },
]
const cashStyles: { value: AccountKind; label: string }[] = [
  {value:'checking',label:'جاري'}, {value:'saving',label:'ادخار'}, {value:'cash_container',label:'نقد فعلي / خزنة'}, {value:'investment',label:'رصيد استثماري'}, {value:'prepaid',label:'مسبق الدفع'}, {value:'fixed_term',label:'لأجل'},
]

export function Assets() {
  const finance = useFinance(); const toast = useToast(); const { state } = finance
  const [reportingCurrency,setReportingCurrency]=useReportingCurrency()
  const [familyFilter,setFamilyFilter]=useState<'all'|AssetGroup>('all')
  const [ownerFilter,setOwnerFilter]=useState('')
  const [groupFilter,setGroupFilter]=useState('')
  const [portfolioFilter,setPortfolioFilter]=useState('')
  const [expanded,setExpanded]=useState<Set<string>>(()=>new Set(initiallyExpanded))
  const [refreshingId,setRefreshingId]=useState<string|null>(null)
  const [editing,setEditing]=useState<Holding|null>(null)

  const activeGroups=(state.accountGroups??[]).filter(g=>g.status==='active')
  const activePortfolios=state.portfolios.filter(p=>p.status==='active')
  const owners=state.parties.filter(p=>p.type==='self'||p.type==='person')
  const assets=state.holdings.filter(h=>!h.archived)
  const display=(v:number)=>formatReportingValue(v,reportingCurrency)

  const groupScope=useMemo(()=>groupFilter?descendantIds(activeGroups,groupFilter):null,[activeGroups,groupFilter])
  const portfolioScope=useMemo(()=>portfolioFilter?portfolioDescendantIds(activePortfolios,portfolioFilter):null,[activePortfolios,portfolioFilter])
  const filteredAssets=useMemo(()=>assets.filter(h=>{
    if(familyFilter!=='all'&&assetGroupOf(h.kind)!==familyFilter)return false
    if(ownerFilter&&ownerQuantity(h,ownerFilter)<=0)return false
    if(groupScope&&(!h.groupId||!groupScope.has(h.groupId)))return false
    if(portfolioScope){const allocated=state.portfolioSlices.some(s=>s.holdingId===h.id&&s.quantity>0&&portfolioScope.has(s.portfolioId)&&(!ownerFilter||s.ownerId===ownerFilter));if(!allocated)return false}
    return true
  }),[assets,familyFilter,ownerFilter,groupScope,portfolioScope,state.portfolioSlices])

  const viewQuantity=(h:Holding)=>{
    if(portfolioScope)return state.portfolioSlices.filter(s=>s.holdingId===h.id&&s.quantity>0&&portfolioScope.has(s.portfolioId)&&(!ownerFilter||s.ownerId===ownerFilter)).reduce((sum,s)=>sum+s.quantity,0)
    if(ownerFilter)return ownerQuantity(h,ownerFilter)
    return h.quantity
  }
  const viewValue=(h:Holding)=>viewQuantity(h)*holdingUnitValueSar(h)
  const totalView=filteredAssets.reduce((sum,h)=>sum+viewValue(h),0)
  const toggle=(id:string)=>setExpanded(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const hasFilters=familyFilter!=='all'||!!ownerFilter||!!groupFilter||!!portfolioFilter
  const clearFilters=()=>{setFamilyFilter('all');setOwnerFilter('');setGroupFilter('');setPortfolioFilter('')}

  return <div className="page-stack">
    <section className="section-intro">
      <div><span className="eyebrow">ASSET TAXONOMY + LENSES</span><h2>الأصول</h2><p>الشجرة الأساسية تصنّف ما تملكه حسب طبيعة الأصل. المالك والمجموعة والمحفظة فلاتر مستقلة لنفس الحقيقة المالية وليست أشجارًا بديلة.</p></div>
      <div className="assets-view-controls"><label className="reporting-currency-control"><span>عملة العرض الرئيسية</span><select value={reportingCurrency} onChange={e=>setReportingCurrency(e.target.value)}>{reportingCurrencyCatalog.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></label></div>
    </section>

    <section className="asset-filters panel">
      <div className="asset-filter-heading"><div><Filter size={17}/><strong>تصفية الأصول</strong></div><span>{filteredAssets.length} من {assets.length} أصل • {display(totalView)}</span></div>
      <div className="asset-filter-grid">
        <label><span>تصنيف الأصل</span><select value={familyFilter} onChange={e=>setFamilyFilter(e.target.value as 'all'|AssetGroup)}><option value="all">كل الأصول</option>{familyOrder.map(f=><option key={f} value={f}>{groupName(f)}</option>)}</select></label>
        <label><span>المالك</span><select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}><option value="">كل الملاك</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label><span>المجموعة</span><select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}><option value="">كل المجموعات</option>{activeGroups.slice().sort((a,b)=>groupPath(activeGroups,a).localeCompare(groupPath(activeGroups,b),'ar')).map(g=><option key={g.id} value={g.id}>{groupPath(activeGroups,g)}</option>)}</select></label>
        <label><span>المحفظة</span><select value={portfolioFilter} onChange={e=>setPortfolioFilter(e.target.value)}><option value="">كل المحافظ</option>{activePortfolios.slice().sort((a,b)=>portfolioPath(activePortfolios,a).localeCompare(portfolioPath(activePortfolios,b),'ar')).map(p=><option key={p.id} value={p.id}>{portfolioPath(activePortfolios,p)}</option>)}</select></label>
      </div>
      {hasFilters&&<button className="ghost asset-filter-reset" onClick={clearFilters}><RotateCcw size={14}/> مسح الفلاتر</button>}
    </section>

    <section className="tree-panel asset-taxonomy-tree">
      {assets.length===0?<EmptyState/>:filteredAssets.length===0?<div className="empty-preview"><Filter/><strong>لا توجد أصول تطابق الفلاتر</strong><span>غيّر أحد الفلاتر أو امسحها لرؤية بقية الأصول.</span></div>:<div className="tree-group taxonomy-root">
        <button className="tree-header" onClick={()=>toggle('all-assets')}><div className="tree-title"><div className="tree-avatar"><WalletCards size={19}/></div><div><strong>{familyFilter==='all'?'كل الأصول':groupName(familyFilter)}</strong><span>{filteredAssets.length} أصل بعد الفلاتر</span></div></div><div className="tree-summary"><strong>{display(totalView)}</strong>{expanded.has('all-assets')?<ChevronDown/>:<ChevronLeft/>}</div></button>
        {expanded.has('all-assets')&&<div className="tree-children">{familyOrder.filter(f=>familyFilter==='all'||familyFilter===f).map(f=><FamilyBranch key={f} family={f}/>)}</div>}
      </div>}
    </section>

    {editing&&<AssetEditor asset={editing} groups={activeGroups} onClose={()=>setEditing(null)} onSave={(payload)=>{try{finance.updateAsset(payload);toast.success(`تم تصحيح «${payload.name}» وحفظ البيانات.`);setEditing(null)}catch(e){toast.error(e instanceof Error?e.message:'تعذر حفظ الأصل')}}}/>} 
  </div>

  function FamilyBranch({family}:{family:AssetGroup}){
    const items=filteredAssets.filter(h=>assetGroupOf(h.kind)===family);if(!items.length)return null
    const key=`family-${family}`;const open=expanded.has(key);const kinds=kindOrder.filter(k=>items.some(h=>h.kind===k))
    return <div className="tree-group taxonomy-family"><button className="tree-header" onClick={()=>toggle(key)}><div className="tree-title"><div className="tree-avatar"><Layers3 size={18}/></div><div><strong>{groupName(family)}</strong><span>{items.length} أصل • {kinds.length} تصنيفات</span></div></div><div className="tree-summary"><strong>{display(items.reduce((s,h)=>s+viewValue(h),0))}</strong>{open?<ChevronDown/>:<ChevronLeft/>}</div></button>{open&&<div className="tree-children">{kinds.map(k=><KindBranch key={k} kind={k} items={items.filter(h=>h.kind===k)}/>)}</div>}</div>
  }

  function KindBranch({kind,items}:{kind:AssetKind;items:Holding[]}){
    const key=`kind-${kind}`;const open=expanded.has(key)
    return <div className="tree-group taxonomy-kind"><button className="tree-header" onClick={()=>toggle(key)}><div className="tree-title"><div className="tree-avatar"><span>{kindGlyph(kind)}</span></div><div><strong>{kindName(kind)}</strong><span>{items.length} أصل</span></div></div><div className="tree-summary"><strong>{display(items.reduce((s,h)=>s+viewValue(h),0))}</strong>{open?<ChevronDown/>:<ChevronLeft/>}</div></button>{open&&<div className="tree-children">{items.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(h=><AssetCard key={h.id} h={h}/>)}</div>}</div>
  }

  async function refresh(h:Holding){const def=assetTypeById(h.assetTypeId);if(!def||!['crypto','metal','security'].includes(def.quoteStrategy))return;setRefreshingId(h.id);try{const quote=await fetchMarketQuote({assetTypeId:def.id,symbol:h.symbol,quoteStrategy:def.quoteStrategy});if(!quote){toast.info('لم يتوفر سعر جديد؛ بقي آخر تقييم محفوظ.');return}finance.updateHoldingQuote(h.id,quote);toast.success(`تم تحديث «${h.name}».`)}catch(e){toast.error(e instanceof Error?e.message:'تعذر تحديث السعر')}finally{setRefreshingId(null)}}

  function AssetCard({h}:{h:Holding}){
    const q=viewQuantity(h);const selectedOwner=ownerFilter||SELF_ID
    const ownerText=ownerFilter?`${state.parties.find(p=>p.id===ownerFilter)?.name??'المالك'}: ${q.toLocaleString('ar-SA')} ${h.nativeUnit}`:h.ownership.filter(s=>s.quantity>0).map(s=>`${state.parties.find(p=>p.id===s.ownerId)?.name}: ${s.quantity.toLocaleString('ar-SA')} ${h.nativeUnit}`).join(' • ')
    const ownerQty=ownerQuantity(h,selectedOwner);const avg=ownerQty>0?ownerWeightedAverageCostSar(h,selectedOwner):null;const basis=ownerQty>0?ownerHoldingCostBasisSar(h,selectedOwner):null;const unrl=ownerQty>0&&h.kind!=='cash'?holdingUnrealizedGainLossSar(h,selectedOwner):null
    const def=assetTypeById(h.assetTypeId);const canRefresh=!!def&&['crypto','metal','security'].includes(def.quoteStrategy);const unit=holdingUnitValueSar(h);const currency=h.kind==='cash'?currencyByCode(h.symbol):undefined
    const portfolioHint=portfolioFilter?' • الكمية المعروضة مخصصة للمحفظة المختارة':''
    return <div className="holding-card"><div className="holding-main"><div className="asset-icon large">{h.symbol}</div><div><strong>{h.name}</strong><span>{kindName(h.kind)}{h.institutionName?` • ${h.institutionName}`:''}{h.last4?` • •••• ${h.last4}`:''}</span></div></div><div className="holding-qty"><strong>{q.toLocaleString('ar-SA')} {h.nativeUnit}</strong><span>≈ {display(q*unit)}</span></div><div className="holding-meta"><span><UserRoundCheck size={15}/> {ownerText||'لا كمية حالية'}{portfolioHint}</span>{h.description&&<span>{h.description}</span>}{h.kind==='cash'&&h.symbol!=='SAR'&&<span>1 {h.symbol} = {money.format(unit)} ر.س{currency?.referenceSar!=null?' • مرجع تلقائي':''}</span>}{avg!=null&&<span>متوسط التكلفة: {display(avg)} / {h.nativeUnit}</span>}{basis!=null&&!portfolioFilter&&<span>Cost Basis: {display(basis)}</span>}{unrl!=null&&!portfolioFilter&&<span className={unrl>=0?'profit':'loss'}>غير محقق: {unrl>=0?'+':''}{display(unrl)}</span>}<span>التقييم: {display(unit)} / {h.nativeUnit}</span></div><div className="category-node-actions"><button title="تعديل كامل" onClick={()=>setEditing(h)}><Pencil size={14}/></button><button title="حذف / إلغاء" onClick={()=>{const why=window.prompt(`سبب حذف «${h.name}»؟ سيتم عكس الأثر المالي الممكن وحفظ Audit.`);if(!why)return;try{finance.deleteAsset(h.id,why);toast.success(`تم حذف/إلغاء «${h.name}» بأمان.`)}catch(e){toast.error(e instanceof Error?e.message:'تعذر حذف الأصل')}}}><Trash2 size={14}/></button>{canRefresh&&<button title="تحديث السعر" onClick={()=>refresh(h)} disabled={refreshingId===h.id}><RefreshCcw size={14}/></button>}</div></div>
  }
}

function AssetEditor({asset,groups,onClose,onSave}:{asset:Holding;groups:AccountGroup[];onClose:()=>void;onSave:(input:any)=>void}){
  const finance=useFinance();const owners=finance.state.parties.filter(p=>p.type==='self'||p.type==='person');const initialOwner=asset.ownership.find(x=>x.quantity>0)?.ownerId??SELF_ID
  const [name,setName]=useState(asset.name);const [kind,setKind]=useState<AssetKind>(asset.kind);const [symbol,setSymbol]=useState(asset.symbol);const [unit,setUnit]=useState(asset.nativeUnit);const [quantity,setQuantity]=useState(String(asset.quantity));const [market,setMarket]=useState(String(asset.marketPriceSar));const [cost,setCost]=useState(String(asset.costLots.reduce((s,l)=>s+l.quantity*(l.unitCostSar??0),0)));const [owner,setOwner]=useState(initialOwner);const [groupId,setGroup]=useState(asset.groupId??'');const [currency,setCurrency]=useState(asset.currency??asset.symbol);const [accountKind,setAccountKind]=useState<AccountKind>(asset.accountKind??'checking');const [last4,setLast4]=useState(asset.last4??'');const [institution,setInstitution]=useState(asset.institutionName??'');const [location,setLocation]=useState(asset.location??'');const [description,setDescription]=useState(asset.description??'');const [reason,setReason]=useState('تصحيح بيانات أدخلتها سابقًا')
  const submit=(e:FormEvent)=>{e.preventDefault();onSave({id:asset.id,name,kind,assetTypeId:asset.assetTypeId,symbol,nativeUnit:unit,ownerId:owner,quantity:num(quantity),marketPriceSar:num(market),costBasisSar:cost.trim()?num(cost):undefined,groupId:groupId||undefined,accountKind:kind==='cash'?accountKind:undefined,currency:kind==='cash'?currency:undefined,last4:last4||undefined,institutionName:institution||undefined,description:description||undefined,location:location||undefined,performanceRole:asset.performanceRole,reason})}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="expense-modal category-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="panel-head"><div><span>تصحيح الأصل</span><h2>{asset.name}</h2><span>الحقول الأساسية أولًا، والتفاصيل النادرة محفوظة أسفل «تفاصيل إضافية» حتى لا تزعج الإدخال اليومي.</span></div></div><form className="trade-form" onSubmit={submit}><GroupCascader groups={groups} value={groupId} onChange={setGroup} label="التموضع"/><div className="field-grid"><label><span>الاسم</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label><span>النوع</span><select value={kind} onChange={e=>setKind(e.target.value as AssetKind)}>{kindOptions.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label></div><div className="field-grid"><label><span>المالك</span><select value={owner} onChange={e=>setOwner(e.target.value)}>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label><span>الكمية / الرصيد</span><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal"/></label></div><div className="field-grid three"><label><span>الرمز</span><input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())}/></label><label><span>الوحدة</span><input value={unit} onChange={e=>setUnit(e.target.value)}/></label><label><span>القيمة الحالية للوحدة بالريال</span><input value={market} onChange={e=>setMarket(e.target.value)} inputMode="decimal"/></label></div><label><span>Cost Basis الكلي</span><input value={cost} onChange={e=>setCost(e.target.value)} inputMode="decimal"/></label>{kind==='cash'&&<><div className="field-grid three"><label><span>العملة</span><select value={currency} onChange={e=>{setCurrency(e.target.value);setSymbol(e.target.value);setUnit(e.target.value)}}>{currencyCatalog.map(c=><option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></label><label><span>طبيعة الأصل النقدي</span><select value={accountKind} onChange={e=>setAccountKind(e.target.value as AccountKind)}>{cashStyles.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label><span>آخر 4 أرقام</span><input value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,'').slice(0,4))}/></label></div><label><span>البنك / المؤسسة</span><input value={institution} onChange={e=>setInstitution(e.target.value)}/></label></>}<details className="optional-details"><summary>تفاصيل إضافية</summary><div className="field-grid"><label><span>الوصف</span><input value={description} onChange={e=>setDescription(e.target.value)}/></label><label><span>الموقع</span><input value={location} onChange={e=>setLocation(e.target.value)}/></label></div></details><label><span>سبب التصحيح</span><input required value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="primary wide" type="submit">حفظ التصحيح</button></form></section></div>
}

function descendantIds(groups:AccountGroup[],rootId:string){const ids=new Set<string>([rootId]);const walk=(id:string)=>groups.filter(g=>g.parentId===id).forEach(g=>{if(!ids.has(g.id)){ids.add(g.id);walk(g.id)}});walk(rootId);return ids}
function portfolioDescendantIds(portfolios:Portfolio[],rootId:string){const ids=new Set<string>([rootId]);const walk=(id:string)=>portfolios.filter(p=>p.parentId===id).forEach(p=>{if(!ids.has(p.id)){ids.add(p.id);walk(p.id)}});walk(rootId);return ids}
function groupPath(groups:AccountGroup[],group:AccountGroup){const parts=[group.name];const seen=new Set([group.id]);let parent=group.parentId?groups.find(g=>g.id===group.parentId):undefined;while(parent&&!seen.has(parent.id)){seen.add(parent.id);parts.unshift(parent.name);parent=parent.parentId?groups.find(g=>g.id===parent!.parentId):undefined}return parts.join(' ← ')}
function portfolioPath(portfolios:Portfolio[],portfolio:Portfolio){const parts=[portfolio.name];const seen=new Set([portfolio.id]);let parent=portfolio.parentId?portfolios.find(p=>p.id===portfolio.parentId):undefined;while(parent&&!seen.has(parent.id)){seen.add(parent.id);parts.unshift(parent.name);parent=parent.parentId?portfolios.find(p=>p.id===parent!.parentId):undefined}return parts.join(' ← ')}
function EmptyState(){return <div className="empty-preview"><WalletCards/><strong>لا توجد أصول بعد</strong><span>أنشئ أصلًا نقديًا أو معدنًا أو عقارًا أو أي أصل آخر، وضعه في المجموعة التي تختارها.</span></div>}
function groupName(g:string){return({cash_and_equivalents:'النقد وما في حكمه',investments:'الاستثمارات',real_estate:'العقارات',other:'أصول أخرى'} as Record<string,string>)[g]??g}
function kindName(k:string){return({cash:'نقد وعملات',metal:'معادن',collectible:'مقتنيات',fund:'صناديق استثمارية',stock:'أسهم',crypto:'عملات رقمية',real_estate:'عقارات',vehicle:'مركبات',fixed_term:'استثمارات لأجل',receivable:'ذمم / مطالبات',other:'أصول أخرى'} as Record<string,string>)[k]??k}
function kindGlyph(k:AssetKind){return({cash:'ن',metal:'م',fund:'ص',stock:'س',crypto:'ر',real_estate:'ع',vehicle:'ك',fixed_term:'ل',receivable:'ذ',collectible:'ق',other:'أ'} as Record<AssetKind,string>)[k]}
