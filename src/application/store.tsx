import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyConversion } from '../domain/finance'
import type { ConversionInput, FinanceState } from '../domain/types'
import { seedState } from '../data/seed'
import { createLocalStorageFinanceRepository } from '../data/localStorageRepository'
import { runScenario, type ScenarioId } from './scenarios'
import {
  addAccount,
  addExistingAsset,
  addFunds,
  allocateToPortfolio,
  createPortfolio,
  purchaseAsset,
  transferFunds,
  type AddAccountInput,
  type AddFundsInput,
  type AllocateToPortfolioInput,
  type CreatePortfolioInput,
  type ExistingAssetInput,
  type PurchaseAssetInput,
  type TransferFundsInput,
} from './commands'

interface FinanceContextValue {
  state: FinanceState
  convert: (input: ConversionInput) => void
  addAccount: (input: AddAccountInput) => void
  addFunds: (input: AddFundsInput) => void
  addExistingAsset: (input: ExistingAssetInput) => void
  purchaseAsset: (input: PurchaseAssetInput) => void
  transferFunds: (input: TransferFundsInput) => void
  createPortfolio: (input: CreatePortfolioInput) => void
  allocateToPortfolio: (input: AllocateToPortfolioInput) => void
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
    addAccount: (input) => persist(addAccount(state, input)),
    addFunds: (input) => persist(addFunds(state, input)),
    addExistingAsset: (input) => persist(addExistingAsset(state, input)),
    purchaseAsset: (input) => persist(purchaseAsset(state, input)),
    transferFunds: (input) => persist(transferFunds(state, input)),
    createPortfolio: (input) => persist(createPortfolio(state, input)),
    allocateToPortfolio: (input) => persist(allocateToPortfolio(state, input)),
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
