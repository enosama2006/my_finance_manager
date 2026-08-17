import { ArrowLeftRight, Calculator, CheckCircle2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { availableQuantity, previewConversion } from '../domain/finance'
import type { AssetKind, ConversionInput } from '../domain/types'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

export function Trade() {
  const { state, convert } = useFinance()
  const ownHoldings = state.holdings.filter(h => (h.ownership.find(s => s.ownerId === SELF_ID)?.quantity ?? 0) > 0 && !h.archived)
  const [sourceId, setSourceId] = useState(ownHoldings[0]?.id ?? '')
  const [sourcePortfolioId, setSourcePortfolioId] = useState('')
  const [sourceQty, setSourceQty] = useState('100')
  const [targetSymbol, setTargetSymbol] = useState('SAR')
  const [targetName, setTargetName] = useState('ريال سعودي')
  const [targetKind, setTargetKind] = useState<AssetKind>('cash')
  const [targetUnit, setTargetUnit] = useState('ر.س')
  const [targetQty, setTargetQty] = useState('100')
  const [targetUnitValue, setTargetUnitValue] = useState('1')
  const [fees, setFees] = useState('0')
  const [targetAccountId, setTargetAccountId] = useState(state.accounts[0]?.id ?? '')
  const [targetPortfolioId, setTargetPortfolioId] = useState('')
  const [message, setMessage] = useState('')

  const source = state.holdings.find(h => h.id === sourceId)
  const sourcePortfolioOptions = state.portfolioSlices.filter(s => s.holdingId === sourceId && s.ownerId === SELF_ID).map(s => state.portfolios.find(p => p.id === s.portfolioId)).filter(Boolean)
  const selectedAccount = state.accounts.find(a => a.id === targetAccountId)

  const input: ConversionInput = {
    sourceHoldingId: sourceId,
    sourcePortfolioId: sourcePortfolioId || undefined,
    targetPortfolioId: targetPortfolioId || sourcePortfolioId || undefined,
    targetSymbol, targetName, targetKind, targetUnit,
    sourceQuantity: Number(sourceQty) || 0,
    targetQuantity: Number(targetQty) || 0,
    targetUnitValueSarAtExecution: Number(targetUnitValue) || 0,
    feesSar: Number(fees) || 0,
    ownerId: SELF_ID,
    targetAccountId,
    targetCustodianId: selectedAccount?.custodianId ?? SELF_ID,
    targetLocation: selectedAccount?.name,
  }

  const preview = useMemo(() => { try { return previewConversion(state, input) } catch { return null } }, [state, sourceId, sourcePortfolioId, sourceQty, targetQty, targetUnitValue, fees, targetAccountId, targetPortfolioId, targetSymbol, targetName, targetKind, targetUnit])
  const selectedAvailable = sourcePortfolioId
    ? state.portfolioSlices.filter(s => s.holdingId === sourceId && s.ownerId === SELF_ID && s.portfolioId === sourcePortfolioId).reduce((sum, s) => sum + s.quantity, 0)
    : availableQuantity(state, sourceId, SELF_ID)

  const submit = () => { try { convert(input); setMessage('تم تسجيل التحويل الحقيقي وحساب الربح/الخسارة المحققة دون خلطه بالتقييم أو إعادة التخصيص.') } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر تنفيذ التحويل') } }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">REAL ASSET CONVERSION</span><h2>تحويل أصل إلى أصل</h2><p>النقد نفسه أصل؛ الحساب الذي يستقبل النقد يحدد مكان الاحتفاظ به فقط. الربح/الخسارة المحققة تنشأ عند التحويل/البيع الحقيقي لا عند نقل الأصل بين الحسابات.</p></div></section>
    <section className="trade-grid">
      <div className="panel trade-form"><div className="panel-head"><div><h2>تفاصيل الصفقة</h2><span>حدد الحصة الاقتصادية التي خرجت وما استلمته فعليًا</span></div><ArrowLeftRight /></div>
        <label>الأصل الخارج<select value={sourceId} onChange={e => { setSourceId(e.target.value); setSourcePortfolioId('') }}>{ownHoldings.map(h => <option key={h.id} value={h.id}>{h.name} — {h.symbol}</option>)}</select></label>
        <label>الحصة/المحفظة المصدر<select value={sourcePortfolioId} onChange={e => setSourcePortfolioId(e.target.value)}><option value="">غير مخصص</option>{sourcePortfolioOptions.map(p => p && <option key={p.id} value={p.id}>{p.name}</option>)}</select><small>المتاح في الاختيار: {selectedAvailable.toLocaleString('ar-SA')} {source?.nativeUnit}</small></label>
        <div className="field-grid"><label>الكمية الخارجة<input type="number" value={sourceQty} onChange={e => setSourceQty(e.target.value)} /></label><label>الرسوم بالريال<input type="number" value={fees} onChange={e => setFees(e.target.value)} /></label></div>
        <div className="divider"><span>ما الذي استلمته؟</span></div>
        <div className="field-grid three"><label>الرمز<input value={targetSymbol} onChange={e => setTargetSymbol(e.target.value.toUpperCase())} /></label><label>اسم الأصل<input value={targetName} onChange={e => setTargetName(e.target.value)} /></label><label>الوحدة<input value={targetUnit} onChange={e => setTargetUnit(e.target.value)} /></label></div>
        <div className="field-grid"><label>الكمية المستلمة<input type="number" value={targetQty} onChange={e => setTargetQty(e.target.value)} /></label><label>قيمة الوحدة بالريال وقت التنفيذ<input type="number" value={targetUnitValue} onChange={e => setTargetUnitValue(e.target.value)} /></label></div>
        <label>الحساب/الحافظ المستقبل<select value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)}>{state.accounts.filter(a => a.status === 'active' && a.kind !== 'credit_card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>المحفظة الهدف<select value={targetPortfolioId} onChange={e => setTargetPortfolioId(e.target.value)}><option value="">نفس المصدر / غير مخصص</option>{state.portfolios.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>نوع الأصل<select value={targetKind} onChange={e => setTargetKind(e.target.value as AssetKind)}><option value="cash">نقد / رصيد عملة</option><option value="metal">معدن</option><option value="fund">صندوق</option><option value="stock">سهم</option><option value="crypto">عملة رقمية</option><option value="real_estate">عقار</option><option value="other">أخرى</option></select></label>
        <button className="primary wide" onClick={submit} disabled={!preview}>تأكيد التحويل الحقيقي</button>{message && <div className="success-note"><CheckCircle2 size={17} />{message}</div>}
      </div>
      <div className="panel preview-card"><div className="panel-head"><div><span className="eyebrow">PREVIEW</span><h2>معاينة الربح والخسارة</h2></div><Calculator /></div>{preview ? <><PreviewRow label="تكلفة الأصل الخارج" value={preview.sourceCostBasisSar == null ? 'غير معروفة' : `${money.format(preview.sourceCostBasisSar)} ر.س`} /><PreviewRow label="قيمة المقابل المستلم" value={`${money.format(preview.proceedsSar)} ر.س`} /><PreviewRow label="الرسوم" value={`${money.format(preview.feesSar)} ر.س`} /><div className="preview-total"><span>Realized P/L</span><strong className={preview.realizedGainLossSar == null ? '' : preview.realizedGainLossSar >= 0 ? 'profit' : 'loss'}>{preview.realizedGainLossSar == null ? 'غير قابل للحساب' : `${preview.realizedGainLossSar >= 0 ? '+' : ''}${money.format(preview.realizedGainLossSar)} ر.س`}</strong></div><div className="rate-box"><span>معدل التحويل الفعلي</span><strong>{money.format(preview.exchangeRate)} {targetUnit} لكل {source?.nativeUnit}</strong></div></> : <div className="empty-preview"><TriangleAlert /><strong>الكمية غير متاحة في الحصة المختارة</strong><span>اختر غير المخصص أو محفظة تحتوي الكمية الفعلية.</span></div>}</div>
    </section>
  </div>
}

function PreviewRow({ label, value }: { label: string; value: string }) { return <div className="preview-row"><span>{label}</span><strong>{value}</strong></div> }
