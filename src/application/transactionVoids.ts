import { ownerQuantity, ownerWeightedAverageCostSar, round2 } from '../domain/finance'
import type { FinanceState, Holding, LedgerTransaction, TransactionRevision } from '../domain/types'
import { voidAssetPurchase } from './assetPurchaseCorrections'
import { voidOpeningBalance } from './openingBalances'

const id=(p:string)=>`${p}-${crypto.randomUUID()}`;const now=()=>new Date().toISOString()
function snapshot(tx:LedgerTransaction):TransactionRevision['snapshot']{return{at:tx.at,title:tx.title,amountSar:tx.amountSar,ownerId:tx.ownerId,sourceHoldingId:tx.sourceHoldingId,targetHoldingId:tx.targetHoldingId,sourceQuantity:tx.sourceQuantity,targetQuantity:tx.targetQuantity,exchangeRate:tx.exchangeRate,feesSar:tx.feesSar,realizedGainLossSar:tx.realizedGainLossSar,note:tx.note,portfolioId:tx.portfolioId,expenseCategoryId:tx.expenseCategoryId,expenseNecessity:tx.expenseNecessity,expenseBeneficiaryId:tx.expenseBeneficiaryId,userInput:tx.userInput}}
function asset(state:FinanceState,id?:string){const a=id?state.holdings.find(h=>h.id===id&&!h.archived):undefined;if(!a)throw new Error('الأصل المرتبط بالحركة غير موجود');return a}
function add(h:Holding,ownerId:string,q:number,unitCost?:number):Holding{const cost=unitCost??ownerWeightedAverageCostSar(h,ownerId)??h.marketPriceSar;const own=h.ownership.some(x=>x.ownerId===ownerId)?h.ownership.map(x=>x.ownerId===ownerId?{...x,quantity:round2(x.quantity+q)}:x):[...h.ownership,{ownerId,quantity:q}];return{...h,quantity:round2(h.quantity+q),ownership:own,costLots:[...h.costLots,{id:id('lot'),ownerId,quantity:q,unitCostSar:cost,acquiredAt:now()}]}}
function remove(h:Holding,ownerId:string,q:number):Holding{if(q>ownerQuantity(h,ownerId)+1e-9)throw new Error('لا يمكن عكس الحركة لأن كمية الأصل تغيرت لاحقًا');let rem=q;const lots=h.costLots.map(l=>{if(l.ownerId!==ownerId||rem<=1e-9)return l;const use=Math.min(l.quantity,rem);rem=round2(rem-use);return{...l,quantity:round2(l.quantity-use)}}).filter(l=>l.quantity>1e-9);if(rem>1e-9)throw new Error('تعذر عكس Cost Basis');return{...h,quantity:round2(h.quantity-q),ownership:h.ownership.map(x=>x.ownerId===ownerId?{...x,quantity:round2(x.quantity-q)}:x).filter(x=>x.quantity>1e-9),costLots:lots}}
function mark(state:FinanceState,tx:LedgerTransaction,reason:string,holdings:Holding[],portfolioSlices=state.portfolioSlices):FinanceState{const revision={version:tx.version,changedAt:now(),reason,snapshot:snapshot(tx)};const voided={...tx,status:'voided' as const,version:tx.version+1,revisions:[...tx.revisions,revision],note:`ملغاة: ${reason}`};return{...state,schemaVersion:5,holdings,portfolioSlices,ledger:state.ledger.map(x=>x.id===tx.id?voided:x)}}
function ownerBasis(h:Holding,ownerId:string){return h.costLots.filter(l=>l.ownerId===ownerId).reduce((sum,l)=>sum+l.quantity*(l.unitCostSar??0),0)}
function reverseConversion(state:FinanceState,tx:LedgerTransaction,reason:string):FinanceState{
 if(!tx.sourceHoldingId||!tx.targetHoldingId||!tx.sourceQuantity||!tx.targetQuantity)throw new Error('بيانات التحويل غير كافية للعكس')
 if(tx.portfolioId)throw new Error('لا يمكن عكس تحويل مرتبط بمحفظة آليًا بعد؛ يجب فك التخصيص/السلسلة أولًا')
 const source=asset(state,tx.sourceHoldingId);const target=asset(state,tx.targetHoldingId)
 const later=state.ledger.some(other=>other.id!==tx.id&&other.status==='posted'&&(other.sourceHoldingId===target.id||other.targetHoldingId===target.id));if(later)throw new Error('الأصل الناتج دخل في حركة لاحقة؛ يجب عكس السلسلة من آخر حركة أولًا')
 const owned=ownerQuantity(target,tx.ownerId);const otherOwners=target.ownership.some(o=>o.ownerId!==tx.ownerId&&o.quantity>1e-9);if(Math.abs(target.quantity-tx.targetQuantity)>1e-9||Math.abs(owned-tx.targetQuantity)>1e-9||otherOwners)throw new Error('كمية/ملكية الأصل الناتج تغيرت؛ لا يمكن عكس التحويل منفردًا')
 const fees=tx.feesSar??0;let sourceBasis:number
 if(target.kind==='cash'&&tx.realizedGainLossSar!=null)sourceBasis=round2(tx.amountSar-fees-tx.realizedGainLossSar)
 else sourceBasis=round2(ownerBasis(target,tx.ownerId)-fees)
 if(!Number.isFinite(sourceBasis)||sourceBasis<0)throw new Error('تعذر استنتاج Cost Basis للأصل المصدر')
 const restored=add(source,tx.ownerId,tx.sourceQuantity,tx.sourceQuantity>0?sourceBasis/tx.sourceQuantity:source.marketPriceSar)
 const holdings=state.holdings.filter(h=>h.id!==target.id).map(h=>h.id===source.id?restored:h)
 const slices=state.portfolioSlices.filter(s=>s.holdingId!==target.id)
 return mark(state,tx,reason,holdings,slices)
}

export function voidTransaction(state:FinanceState,transactionId:string,reason:string):FinanceState{
 const why=reason.trim();if(!why)throw new Error('سبب الحذف/الإلغاء مطلوب');const tx=state.ledger.find(x=>x.id===transactionId);if(!tx)throw new Error('الحركة غير موجودة');if(tx.status!=='posted')throw new Error('الحركة ليست نشطة')
 if(tx.kind==='opening')return voidOpeningBalance(state,tx.id,why)
 if(tx.kind==='asset_purchase')return voidAssetPurchase(state,tx.id,why)
 if(tx.kind==='conversion')return reverseConversion(state,tx,why)
 if(tx.kind==='income'){if(!tx.targetHoldingId||!tx.targetQuantity)throw new Error('بيانات الدخل غير كافية للعكس');const target=asset(state,tx.targetHoldingId);const next=remove(target,tx.ownerId,tx.targetQuantity);return mark(state,tx,why,state.holdings.map(h=>h.id===target.id?next:h))}
 if(tx.kind==='expense'){if(!tx.sourceHoldingId||!tx.sourceQuantity)throw new Error('بيانات المصروف غير كافية للعكس');const source=asset(state,tx.sourceHoldingId);const unit=tx.sourceQuantity>0?tx.amountSar/tx.sourceQuantity:source.marketPriceSar;const next=add(source,tx.ownerId,tx.sourceQuantity,unit);let slices=state.portfolioSlices;if(tx.portfolioId){const found=slices.find(s=>s.portfolioId===tx.portfolioId&&s.holdingId===source.id&&s.ownerId===tx.ownerId);slices=found?slices.map(s=>s.id===found.id?{...s,quantity:round2(s.quantity+tx.sourceQuantity!)}:s):[...slices,{id:id('slice'),portfolioId:tx.portfolioId,holdingId:source.id,ownerId:tx.ownerId,quantity:tx.sourceQuantity}]};return mark(state,tx,why,state.holdings.map(h=>h.id===source.id?next:h),slices)}
 if(tx.kind==='real_transfer'){if(!tx.sourceHoldingId||!tx.targetHoldingId||!tx.sourceQuantity||!tx.targetQuantity)throw new Error('بيانات النقل غير كافية للعكس');const source=asset(state,tx.sourceHoldingId);const target=asset(state,tx.targetHoldingId);const targetNext=remove(target,tx.ownerId,tx.targetQuantity);const unit=tx.sourceQuantity>0?tx.amountSar/tx.sourceQuantity:source.marketPriceSar;const sourceNext=add(source,tx.ownerId,tx.sourceQuantity,unit);return mark(state,tx,why,state.holdings.map(h=>h.id===source.id?sourceNext:h.id===target.id?targetNext:h))}
 if(tx.kind==='reconciliation'){if(tx.targetHoldingId&&tx.targetQuantity){const target=asset(state,tx.targetHoldingId);const next=remove(target,tx.ownerId,tx.targetQuantity);return mark(state,tx,why,state.holdings.map(h=>h.id===target.id?next:h))}if(tx.sourceHoldingId&&tx.sourceQuantity){const source=asset(state,tx.sourceHoldingId);const unit=tx.sourceQuantity>0?tx.amountSar/tx.sourceQuantity:source.marketPriceSar;const next=add(source,tx.ownerId,tx.sourceQuantity,unit);return mark(state,tx,why,state.holdings.map(h=>h.id===source.id?next:h))}throw new Error('هذه التسوية لا تحمل كمية قابلة للعكس تلقائيًا')}
 throw new Error(`إلغاء ${tx.kind} يحتاج Replay لسلسلته المالية؛ لن نحذف الحركة بطريقة قد تفسد الأرصدة.`)
}
