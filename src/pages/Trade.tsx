import { ArrowLeftRight, Calculator, CheckCircle2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import { previewConversion } from '../domain/finance'
import type { AssetKind, ConversionInput } from '../domain/types'
import { SELF_ID } from '../data/seed'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

export function Trade() {
  const { state, convert } = useFinance()
  const ownHoldings = state.holdings.filter(h => (h.ownership.find(s => s.ownerId === SELF_ID)?.quantity ?? 0) > 0)
  const [sourceId, setSourceId] = useState(ownHoldings[0]?.id ?? '')
  const [sourceQty, setSourceQty] = useState('100')
  const [targetSymbol, setTargetSymbol] = useState('SAR')
  const [targetName, setTargetName] = useState('ريال سعودي')
  const [targetKind, setTargetKind] = useState<AssetKind>('currency')
  const [targetUnit, setTargetUnit] = useState('ر.س')
  const [targetQty, setTargetQty] = useState('100')
  const [targetUnitValue, setTargetUnitValue] = useState('1')
  const [fees, setFees] = useState('0')
  const [message, setMessage] = useState('')

  const input: ConversionInput = {
    sourceHoldingId: sourceId,
    targetSymbol,
    targetName,
    targetKind,
    targetUnit,
    sourceQuantity: Number(sourceQty) || 0,
    targetQuantity: Number(targetQty) || 0,
    targetUnitValueSarAtExecution: Number(targetUnitValue) || 0,
    feesSar: Number(fees) || 0,
    ownerId: SELF_ID,
    targetContainer: 'ناتج تحويل أصل',
    targetCustodianId: SELF_ID,
    targetLocation: 'بحوزتي',
  }

  const preview = useMemo(() => {
    try { return previewConversion(state, input) } catch { return null }
  }, [state, sourceId, sourceQty, targetQty, targetUnitValue, fees])

  const source = state.holdings.find(h => h.id === sourceId)
  const ownQty = source?.ownership.find(s => s.ownerId === SELF_ID)?.quantity ?? 0

  const submit = () => {
    try {
      convert(input)
      setMessage('تم تسجيل التحويل في السجل غير القابل للنقل وحُسب الربح/الخسارة المحققة.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر تنفيذ التحويل')
    }
  }

  return <div className="page-stack">
    <section className="section-intro"><div><span className="eyebrow">ASSET CONVERSION / REALIZED P&L</span><h2>تحويل أصل إلى أصل</h2><p>هذه العملية فقط — أو البيع الحقيقي — تنشئ ربحًا أو خسارة محققة. النقل والحيازة وإعادة التخصيص لا تفعل ذلك.</p></div></section>

    <section className="trade-grid">
      <div className="panel trade-form">
        <div className="panel-head"><div><h2>تفاصيل الصفقة</h2><span>حدد الكمية الخارجة وما استلمته فعليًا</span></div><ArrowLeftRight /></div>
        <label>الأصل الخارج<select value={sourceId} onChange={e => setSourceId(e.target.value)}>{ownHoldings.map(h => <option key={h.id} value={h.id}>{h.name} — متاح {h.ownership.find(s => s.ownerId === SELF_ID)?.quantity} {h.nativeUnit}</option>)}</select></label>
        <div className="field-grid"><label>الكمية الخارجة<input type="number" value={sourceQty} onChange={e => setSourceQty(e.target.value)} /><small>المتاح: {ownQty.toLocaleString('ar-SA')} {source?.nativeUnit}</small></label><label>الرسوم بالريال<input type="number" value={fees} onChange={e => setFees(e.target.value)} /></label></div>
        <div className="divider"><span>ما الذي استلمته؟</span></div>
        <div className="field-grid three"><label>الرمز<input value={targetSymbol} onChange={e => setTargetSymbol(e.target.value.toUpperCase())} /></label><label>اسم الأصل<input value={targetName} onChange={e => setTargetName(e.target.value)} /></label><label>الوحدة<input value={targetUnit} onChange={e => setTargetUnit(e.target.value)} /></label></div>
        <div className="field-grid"><label>الكمية المستلمة<input type="number" value={targetQty} onChange={e => setTargetQty(e.target.value)} /></label><label>قيمة الوحدة بالريال عند التنفيذ<input type="number" value={targetUnitValue} onChange={e => setTargetUnitValue(e.target.value)} /><small>تستخدم لتوحيد قيمة المقابل وحساب P/L.</small></label></div>
        <label>نوع الأصل<select value={targetKind} onChange={e => setTargetKind(e.target.value as AssetKind)}><option value="currency">عملة</option><option value="metal">معدن</option><option value="fund">صندوق</option><option value="stock">سهم</option><option value="other">أخرى</option></select></label>
        <button className="primary wide" onClick={submit} disabled={!preview}>تأكيد التحويل وتثبيته في السجل</button>
        {message && <div className="success-note"><CheckCircle2 size={17} />{message}</div>}
      </div>

      <div className="panel preview-card">
        <div className="panel-head"><div><span className="eyebrow">PREVIEW</span><h2>معاينة الربح والخسارة</h2></div><Calculator /></div>
        {preview ? <>
          <PreviewRow label="تكلفة الأصل الخارج" value={`${money.format(preview.sourceCostBasisSar)} ر.س`} />
          <PreviewRow label="قيمة المقابل المستلم" value={`${money.format(preview.proceedsSar)} ر.س`} />
          <PreviewRow label="الرسوم" value={`${money.format(preview.feesSar)} ر.س`} />
          <div className="preview-total"><span>Realized P/L</span><strong className={preview.realizedGainLossSar >= 0 ? 'profit' : 'loss'}>{preview.realizedGainLossSar >= 0 ? '+' : ''}{money.format(preview.realizedGainLossSar)} ر.س</strong></div>
          <div className="rate-box"><span>معدل التحويل الفعلي</span><strong>{money.format(preview.exchangeRate)} {targetUnit} لكل {source?.nativeUnit}</strong></div>
        </> : <div className="empty-preview"><TriangleAlert /><strong>أدخل كميات صحيحة</strong><span>لن يتم إنشاء أي عملية قبل اكتمال المعاينة.</span></div>}
      </div>
    </section>
  </div>
}

function PreviewRow({ label, value }: { label: string; value: string }) { return <div className="preview-row"><span>{label}</span><strong>{value}</strong></div> }
