import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyConversion, applyPureReallocation } from '../domain/finance'
import type { ConversionInput, FinanceState } from '../domain/types'
import { seedState } from '../data/seed'

const STORAGE_KEY = 'myfinman-cycle1-v1'

interface FinanceContextValue {
  state: FinanceState
  convert: (input: ConversionInput) => void
  reallocate: (allocationId: string, fundedSar: number) => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

function loadInitial(): FinanceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as FinanceState : seedState
  } catch {
    return seedState
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(loadInitial)

  const persist = (next: FinanceState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const value = useMemo<FinanceContextValue>(() => ({
    state,
    convert: (input) => persist(applyConversion(state, input)),
    reallocate: (allocationId, fundedSar) => persist(applyPureReallocation(state, allocationId, fundedSar)),
    reset: () => persist(seedState),
  }), [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
