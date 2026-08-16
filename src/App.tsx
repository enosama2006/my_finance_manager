import { useState } from 'react'
import { useFinance } from './application/store'
import { Shell, type PageKey } from './components/Shell'
import { Dashboard } from './pages/Dashboard'
import { Assets } from './pages/Assets'
import { Allocations } from './pages/Allocations'
import { Ledger } from './pages/Ledger'
import { Trade } from './pages/Trade'

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard')
  const { reset } = useFinance()
  return <Shell page={page} onPage={setPage} onReset={reset}>
    {page === 'dashboard' && <Dashboard goAssets={() => setPage('assets')} goTrade={() => setPage('trade')} />}
    {page === 'assets' && <Assets />}
    {page === 'allocations' && <Allocations />}
    {page === 'ledger' && <Ledger />}
    {page === 'trade' && <Trade />}
  </Shell>
}
