import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useFinance } from './application/store'
import { Shell, type PageKey } from './components/Shell'
import { Dashboard } from './pages/Dashboard'
import { Assets } from './pages/Assets'
import { Allocations } from './pages/Allocations'
import { Ledger } from './pages/Ledger'
import { Trade } from './pages/Trade'
import { ScenarioLab } from './pages/ScenarioLab'
import { OperationsHub } from './pages/OperationsHub'

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard')
  const finance = useFinance()
  const demoLoaded = finance.state.portfolios.some(p => p.id === 'p-rent') && finance.state.holdings.some(h => h.id === 'h-alinma-sar')

  return <Shell page={page} onPage={setPage} onReset={finance.reset}>
    {page === 'dashboard' && <Dashboard goAssets={() => setPage('assets')} goTrade={() => setPage('operations')} />}
    {page === 'assets' && <Assets />}
    {page === 'allocations' && <Allocations />}
    {page === 'operations' && <OperationsHub goTrade={() => setPage('trade')} />}
    {page === 'ledger' && <Ledger />}
    {page === 'trade' && <Trade />}
    {page === 'lab' && (demoLoaded ? <ScenarioLab /> : <DemoGate onLoad={finance.loadDemo} />)}
  </Shell>
}

function DemoGate({ onLoad }: { onLoad: () => void }) {
  return <div className="page-stack"><section className="panel demo-gate"><FlaskConical size={28} /><div><span className="eyebrow">ISOLATED DEMO DATA</span><h2>مختبر السيناريوهات منفصل عن تجربتك</h2><p>التطبيق يبدأ خاليًا من البيانات المالية. تحميل المختبر سيستبدل بياناتك الحالية مؤقتًا ببيانات الاختبار الجاهزة، لذلك استخدمه فقط عندما تريد تجربة السيناريوهات.</p></div><button className="secondary" onClick={() => { if (window.confirm('سيتم استبدال بيانات التطبيق الحالية ببيانات المختبر. هل تريد المتابعة؟')) onLoad() }}>تحميل بيانات المختبر</button></section></div>
}
