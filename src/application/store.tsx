import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyConversion } from '../domain/finance'
import type { ConversionInput, FinanceState } from '../domain/types'
import { seedState } from '../data/seed'
import { createLocalStorageFinanceRepository } from '../data/localStorageRepository'
import { runScenario, type ScenarioId } from './scenarios'

interface FinanceContextValue {
  state: FinanceState
  convert: (input: ConversionInput) => void
  runScenario: (id: ScenarioId) => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)
const repository = createLocalStorageFinanceRepository()

function normalize(state: FinanceState): FinanceState {
  return { ...state, positions: state.positions ?? [], capitalCycles: state.capitalCycles ?? [] }
}

function loadInitial(): FinanceState {
  return normalize(repository.load() ?? seedState)
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(loadInitial)

  const persist = (next: FinanceState) => {
    const normalized = normalize(next)
    setState(normalized)
    repository.save(normalized)
  }

  const value = useMemo<FinanceContextValue>(() => ({
    state,
    convert: (input) => persist(applyConversion(state, input)),
    runScenario: (id) => persist(runScenario(state, id)),
    reset: () => {
      repository.clear()
      persist(seedState)
    },
  }), [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
