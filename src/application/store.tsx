import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { applyConversion } from '../domain/finance'
import type { ConversionInput, FinanceState } from '../domain/types'
import { seedState } from '../data/seed'
import { emptyState } from '../data/emptyState'
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
import {
  archiveExpenseCategory,
  createExpenseCategory,
  createParty,
  spendExpense,
  updateExpenseCategory,
  type CreateExpenseCategoryInput,
  type CreatePartyInput,
  type SpendExpenseInput,
  type UpdateExpenseCategoryInput,
} from './expenses'

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
  createParty: (input: CreatePartyInput) => void
  createExpenseCategory: (input: CreateExpenseCategoryInput) => void
  updateExpenseCategory: (input: UpdateExpenseCategoryInput) => void
  archiveExpenseCategory: (categoryId: string) => void
  spendExpense: (input: SpendExpenseInput) => void
  runScenario: (id: ScenarioId) => void
  loadDemo: () => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)
const repository = createLocalStorageFinanceRepository()

function normalize(state: FinanceState): FinanceState {
  return {
    ...state,
    expenseCategories: state.expenseCategories ?? [],
    positions: state.positions ?? [],
    capitalCycles: state.capitalCycles ?? [],
  }
}

function loadInitial(): FinanceState {
  return normalize(repository.load() ?? emptyState)
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
    createParty: (input) => persist(createParty(state, input)),
    createExpenseCategory: (input) => persist(createExpenseCategory(state, input)),
    updateExpenseCategory: (input) => persist(updateExpenseCategory(state, input)),
    archiveExpenseCategory: (categoryId) => persist(archiveExpenseCategory(state, categoryId)),
    spendExpense: (input) => persist(spendExpense(state, input)),
    runScenario: (id) => persist(runScenario(state, id)),
    loadDemo: () => {
      repository.clear()
      persist(seedState)
    },
    reset: () => {
      repository.clear()
      persist(emptyState)
    },
  }), [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
