import { Boxes, ChartNoAxesCombined, CheckCircle2, CircleAlert, Landmark, Play, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinance } from '../application/store'
import type { ScenarioId } from '../application/scenarios'
import { accountValueSar, availableByOwner, netWorthByOwner } from '../domain/finance'
import { capitalCycleResultSar, portfolioCoverage, positionMetrics } from '../domain/lifecycle'
import { SELF_ID } from '../data/seed'
import '../scenario-lab.css'

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 })

function statusDone(stateIds: string[], id: string) { return stateIds.includes(id) }

export function ScenarioLab() {
  const { state, runScenario } = useFinance()
  const [message, setMessage] = useState('')
  const ledgerIds = useMemo(() => state.ledger.map(t => t.id), [state.ledger])
  const netWorth = netWorthByOwner(state, SELF_ID)
  const free = availableByOwner(state, SELF_ID)
  const rent = portfolioCoverage(state, 'p-rent')
  const school = portfolioCoverage(state, 'p-school')
  const openCycles = (state.capitalCycles ?? []).filter(c => c.status !== 'closed' && c.status !== 'cancelled')
  const closedCycles = (state.capitalCycles ?? []).filter(c => c.status === 'closed')

  const act = (id: ScenarioId, success: string) => {
    try {
      runScenario(id)
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تنفيذ السيناريو')
    }
  }

  return <div className="page-stack scenario-lab">
    <section className="lab-hero">
      <div><span className="eyebrow">MYFINMAN OPERATING LAB V1</span><h2>مختبر نظام التشغيل المالي</h2><p>جرّب دورة رأس المال كاملة: حساب حقيقي → شراء/تحويل → Cost Basis → Position → Portfolio → Capital Cycle → ربح/خسارة محققة أو غير محققة.</p></div>
      <div className="lab-principle"><strong>قاعدة المختبر</strong><span>كل زر يغير الحالة المالية فعليًا ويحفظ أثره في الـLedger. استخدم «إعادة البيانات» من الأعلى للبدء من جديد.</span></div>
    </section>

    {message && <div className="lab-message"><CheckCircle2 size={18} /><span>{message}</span></div>}

    <section className="lab-kpis">
      <Kpi label="صافي الثروة — أنا" value={`${money.format(netWorth)} ر.س`} hint="ملكية فعلية ناقص الالتزامات" />
      <Kpi label="المتاح وفق التخصيصات الحالية" value={`${money.format(free)} ر.س`} hint="Prototype V4 allocation view" />
      <Kpi label="دورات مفتوحة" value={String(openCycles.length)} hint="قد تحتوي ربحًا مؤقتًا لم يثبت نهائيًا" />
      <Kpi label="دورات مغلقة" value={String(closedCycles.length)} hint={`${money.format(closedCycles.reduce((s, c) => s + (c.reportingResultSar ?? capitalCycleResultSar(c)), 0))} ر.س نتيجة تاريخية`} />
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><WalletCards size={20} /><div><h3>1. الحسابات: أين يوجد المال فعلًا؟</h3><p>هذه القيم تتحرك عندما تشغّل سيناريو شراء حقيقي؛ التسجيل التاريخي لأصل موجود لا يغيرها.</p></div></div>
      <div className="account-grid">
        {['acc-alrajhi', 'acc-alinma', 'acc-vault', 'acc-binance', 'acc-turkey', 'acc-syria-assets'].map(id => {
          const account = state.accounts.find(a => a.id === id)
          if (!account) return null
          return <div className="account-mini" key={id}><Landmark size={17} /><div><strong>{account.name}</strong><span>{money.format(accountValueSar(state, id))} ر.س قيمة حالية</span></div></div>
        })}
      </div>
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><ChartNoAxesCombined size={20} /><div><h3>2. تجارب دورة التكلفة والأصل</h3><p>كل تجربة مصممة لتختبر قاعدة مختلفة اتفقنا عليها، لا مجرد إضافة رقم إلى الشاشة.</p></div></div>
      <div className="scenario-grid">
        <ScenarioCard title="SAR → USD → أرض" tag="Cost Flow" done={statusDone(ledgerIds, 'lab-land-buy')} summary="اخرج 39,000 ر.س لشراء 10,000 USD بتكلفة شاملة 3.90، ثم اشترِ الأرض. التكلفة النهائية للأرض تبقى 39,000 ر.س، والقيمة الأولية 39,270." actions={[{ label: 'شراء الأرض', onClick: () => act('land_purchase', 'تم شراء الأرض وترحيل كامل تكلفة SAR → USD → Land.') }]} position={positionLine(state, 'pos-lab-land')} />

        <ScenarioCard title="ذهب 10غ — شراء ثم بيع" tag="Position Closure" done={statusDone(ledgerIds, 'lab-gold-sell')} summary="اشترِ 10غ بتكلفة شاملة 540 ر.س/غ بينما السوق 530، ثم بعها بـ550 ر.س/غ. عند البيع: 5,400 رجوع رأس مال + 100 ر.س ربح فقط." actions={[{ label: 'شراء 10غ', onClick: () => act('gold_buy', 'فتح مركز ذهب 10غ بتكلفة 5,400 ر.س.') }, { label: 'بيع 10غ وإغلاق المركز', onClick: () => act('gold_sell', 'أُغلق مركز الذهب وثُبّت ربح 100 ر.س.') }]} position={positionLine(state, 'pos-lab-gold')} />

        <ScenarioCard title="Google Pay → USDT → XRP" tag="Acquisition Chain" done={statusDone(ledgerIds, 'lab-xrp-buy')} summary="تكلفة اقتصادية 1,000 USD، يصل 985 USDT بعد friction ثم تتحول إلى 985 XRP. الـ15 USD لا تضيع؛ تدخل في Cost Basis النهائي." actions={[{ label: 'شراء XRP', onClick: () => act('xrp_purchase', 'تم شراء XRP وحمل تكلفة الـon-ramp إلى المركز النهائي.') }]} position={positionLine(state, 'pos-lab-xrp')} />

        <ScenarioCard title="USD كسيولة — Realized only" tag="Performance Policy" done={statusDone(ledgerIds, 'lab-usd-sell')} summary="اشترِ 10,000 USD بـ37,650 ر.س ولا تعرض خسارة غير محققة أثناء الاحتفاظ. أعد بيعها بـ37,400 ر.س لتثبيت خسارة -250 ر.س عند الإغلاق." actions={[{ label: 'شراء USD', onClick: () => act('usd_buy', 'فُتح مركز USD كسيولة تشغيلية؛ التكلفة محفوظة وUnrealized P/L مخفي.') }, { label: 'إعادة البيع إلى SAR', onClick: () => act('usd_sell', 'أُغلق مركز USD وثُبتت خسارة -250 ر.س.') }]} position={positionLine(state, 'pos-lab-usd')} />

        <ScenarioCard title="SYP كمركز استثماري" tag="FX Mark-to-Market" done={statusDone(ledgerIds, 'lab-syp-buy')} summary="اشترِ 125,000 SYP على أساس 125 SYP/USD. التقييم التجريبي 122 SYP/USD؛ انخفاض عدد الليرات لكل دولار يعني أن SYP أقوى، لذلك يظهر الربح غير المحقق." actions={[{ label: 'شراء SYP', onClick: () => act('syp_investment', 'فُتح مركز SYP استثماري بتسعير اتجاهي صحيح للزوج.') }]} position={positionLine(state, 'pos-lab-syp')} />
      </div>
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><Boxes size={20} /><div><h3>3. السيارة والأصول القائمة</h3><p>اختبر الفرق بين Existing Asset onboarding وبين شراء أصل جديد بعد بدء استخدام النظام.</p></div></div>
      <div className="scenario-grid two">
        <ScenarioCard title="سيارة موجودة قبل التطبيق" tag="Opening Asset" done={statusDone(ledgerIds, 'lab-car-existing')} summary="تسجيل سيارة تكلفتها التاريخية 120,000 وقيمتها الحالية 135,000. لا يُخصم ريال واحد من أي حساب حالي." actions={[{ label: 'تسجيل السيارة القائمة', onClick: () => act('existing_car', 'سُجل الأصل القائم دون أي حركة مصرفية وهمية.') }]} position={positionLine(state, 'pos-lab-car-existing')} />
        <ScenarioCard title="شراء سيارة استثمارية جديدة" tag="Real Purchase" done={statusDone(ledgerIds, 'lab-car-buy')} summary="شراء حقيقي بـ150,000 ر.س من الإنماء؛ ينخفض الحساب وتظهر السيارة بتكلفتها 150,000 وقيمتها الحالية التجريبية 145,000." actions={[{ label: 'شراء السيارة', onClick: () => act('new_car', 'تم الشراء الحقيقي: الإنماء -150,000 وأُنشئ مركز السيارة.') }]} position={positionLine(state, 'pos-lab-car-new')} />
      </div>
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><CircleAlert size={20} /><div><h3>4. محافظ الالتزامات: القيمة ≠ الجاهزية للسداد</h3><p>الإيجار مثال متعمد: المحفظة مغطاة اقتصاديًا، لكن معظمها ذهب وليس SAR جاهزًا للسداد.</p></div></div>
      <div className="coverage-grid">
        <CoverageCard name="إيجار المنزل" coverage={rent} />
        <CoverageCard name="المدارس" coverage={school} />
      </div>
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><ChartNoAxesCombined size={20} /><div><h3>5. دورة تجارية قصيرة</h3><p>الربح في منتصف الدورة ليس النتيجة النهائية. افتح العملية ثم أغلقها بعد تسجيل تكلفة التسوية الإضافية.</p></div></div>
      <ScenarioCard title="1,000 USDT → 50,000 TRY → إغلاق التسوية" tag="Capital Cycle" done={statusDone(ledgerIds, 'lab-commercial-close')} summary="مرجع 45 TRY/USDT والبيع 50: هامش 5,000 TRY. تظل الدورة مفتوحة، ثم تسجل تكلفة إضافية 10 USD فوق التسوية؛ عندها فقط تثبت النتيجة النهائية." actions={[{ label: 'تنفيذ البيع وفتح الدورة', onClick: () => act('commercial_open', 'تم البيع وظهر هامش محقق مؤقت، لكن الدورة ما زالت مفتوحة.') }, { label: 'تسجيل التكلفة وإغلاق الدورة', onClick: () => act('commercial_close', 'أُغلقت الدورة وثُبتت النتيجة التاريخية بعد التكلفة الإضافية.') }]} cycle={cycleLine(state, 'cycle-commercial')} />
    </section>

    <section className="lab-section">
      <div className="lab-section-title"><Boxes size={20} /><div><h3>6. محفظة الطفل والادخار الطويل</h3><p>هذه المحفظة لا تُغلق عند شراء أو بيع أصل واحد. الإيداعات رأس مال جديد وليست ربحًا.</p></div></div>
      <div className="child-summary">
        <div><span>نقد شام</span><strong>{money.format(state.holdings.find(h => h.id === 'h-child-sar')?.quantity ?? 0)} ر.س</strong></div>
        <div><span>ذهب شام</span><strong>{money.format((state.holdings.find(h => h.id === 'h-child-gold')?.quantity ?? 0))} غ</strong></div>
        <div><span>قيمة المحفظة الحالية</span><strong>{money.format(portfolioValue(state, 'p-child'))} ر.س</strong></div>
        <div><span>الحالة</span><strong>مفتوحة طويلة الأجل</strong></div>
      </div>
    </section>
  </div>
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="lab-kpi"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
}

function ScenarioCard({ title, tag, summary, actions, done, position, cycle }: { title: string; tag: string; summary: string; actions: { label: string; onClick: () => void }[]; done: boolean; position?: string; cycle?: string }) {
  return <article className="scenario-card">
    <div className="scenario-head"><div><span className="scenario-tag">{tag}</span><h4>{title}</h4></div>{done && <CheckCircle2 className="done-icon" size={21} />}</div>
    <p>{summary}</p>
    {(position || cycle) && <div className="scenario-result">{position || cycle}</div>}
    <div className="scenario-actions">{actions.map(a => <button key={a.label} onClick={a.onClick}><Play size={15} />{a.label}</button>)}</div>
  </article>
}

function positionLine(state: ReturnType<typeof useFinance>['state'], id: string) {
  const position = (state.positions ?? []).find(p => p.id === id)
  if (!position) return undefined
  const m = positionMetrics(state, id)
  const unrealizedVisible = position.performanceRole !== 'transactional_cash' && position.performanceRole !== 'bridge' && position.status !== 'closed'
  const result = position.status === 'closed' ? m.realizedGainLossSar : unrealizedVisible ? m.unrealizedGainLossSar : null
  return `المركز: ${position.status === 'closed' ? 'مغلق' : 'مفتوح'} • التكلفة ${money.format(position.initialCostBasisSar)} ر.س • القيمة ${money.format(m.currentValueSar)} ر.س${result == null ? ' • P/L غير معروض أثناء الاحتفاظ' : ` • P/L ${result >= 0 ? '+' : ''}${money.format(result)} ر.س (${m.returnPct == null ? '—' : `${pct.format(m.returnPct)}%`})`}`
}

function cycleLine(state: ReturnType<typeof useFinance>['state'], id: string) {
  const cycle = (state.capitalCycles ?? []).find(c => c.id === id)
  if (!cycle) return undefined
  const result = cycle.reportingResultSar ?? capitalCycleResultSar(cycle)
  return `الدورة: ${cycle.status === 'closed' ? 'مغلقة' : 'مفتوحة'} • مكاسب ${money.format(cycle.realizedGainsSar)} • تكاليف ${money.format(cycle.directCostsSar)} • التزام مفتوح ${money.format(cycle.openObligationSar)} • النتيجة ${money.format(result)} ر.س${cycle.nativeResultAmount != null ? ` • ${money.format(cycle.nativeResultAmount)} ${cycle.nativeResultCurrency}` : ''}`
}

function CoverageCard({ name, coverage }: { name: string; coverage: ReturnType<typeof portfolioCoverage> }) {
  return <div className="coverage-card"><strong>{name}</strong><div><span>المطلوب</span><b>{money.format(coverage.requiredSar)} ر.س</b></div><div><span>التغطية الاقتصادية</span><b>{pct.format(coverage.economicCoveragePct)}% · {money.format(coverage.economicCoverageSar)}</b></div><div><span>جاهز للسداد</span><b className={coverage.settlementReadyPct < 100 ? 'warn' : ''}>{pct.format(coverage.settlementReadyPct)}% · {money.format(coverage.settlementReadySar)}</b></div></div>
}

function portfolioValue(state: ReturnType<typeof useFinance>['state'], portfolioId: string) {
  return state.portfolioSlices.filter(s => s.portfolioId === portfolioId).reduce((sum, s) => {
    const h = state.holdings.find(x => x.id === s.holdingId)
    return sum + (h ? s.quantity * h.marketPriceSar : 0)
  }, 0)
}
