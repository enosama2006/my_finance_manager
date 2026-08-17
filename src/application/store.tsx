import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ConversionInput, ExpenseCategory, FinanceState } from '../domain/types'
import type { MarketQuote } from '../data/marketData'
import { parseSnapshot } from '../data/snapshot'
import { seedState } from '../data/seed'
import { emptyState } from '../data/emptyState'
import { createLocalStorageFinanceRepository } from '../data/localStorageRepository'
import { runScenario, type ScenarioId } from './scenarios'
import { applyManagedConversion } from './conversionPolicy'
import {
  addAccount, addExistingAsset, addFunds, allocateToPortfolio, createPortfolio, transferFunds,
  type AddAccountInput, type AddFundsInput, type AllocateToPortfolioInput, type CreatePortfolioInput, type ExistingAssetInput, type TransferFundsInput,
} from './commands'
import { applyHoldingMarketQuote, purchaseAssetSimplified, type SimplifiedPurchaseInput } from './purchase'
import {
  archiveExpenseBeneficiary, archiveExpenseCategory, createExpenseBeneficiary, createExpenseCategory, createParty, spendExpense,
  updateExpenseBeneficiary, updateExpenseCategory,
  type CreateExpenseBeneficiaryInput, type CreateExpenseCategoryInput, type CreatePartyInput, type SpendExpenseInput,
  type UpdateExpenseBeneficiaryInput, type UpdateExpenseCategoryInput,
} from './expenses'

interface FinanceContextValue {
  state: FinanceState
  convert: (input: ConversionInput) => void
  addAccount: (input: AddAccountInput) => void
  addFunds: (input: AddFundsInput) => void
  addExistingAsset: (input: ExistingAssetInput) => void
  purchaseAsset: (input: SimplifiedPurchaseInput) => void
  transferFunds: (input: TransferFundsInput) => void
  createPortfolio: (input: CreatePortfolioInput) => void
  allocateToPortfolio: (input: AllocateToPortfolioInput) => void
  updateHoldingQuote: (holdingId: string, quote: MarketQuote) => void
  createParty: (input: CreatePartyInput) => void
  createExpenseCategory: (input: CreateExpenseCategoryInput) => void
  updateExpenseCategory: (input: UpdateExpenseCategoryInput) => void
  archiveExpenseCategory: (categoryId: string) => void
  createExpenseBeneficiary: (input: CreateExpenseBeneficiaryInput) => void
  updateExpenseBeneficiary: (input: UpdateExpenseBeneficiaryInput) => void
  archiveExpenseBeneficiary: (beneficiaryId: string) => void
  spendExpense: (input: SpendExpenseInput) => void
  importSnapshot: (raw: string) => void
  runScenario: (id: ScenarioId) => void
  loadDemo: () => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)
const repository = createLocalStorageFinanceRepository()

function materializeCategoryNecessity(categories: ExpenseCategory[]): ExpenseCategory[] {
  const byId = new Map(categories.map(c => [c.id, c]))
  const resolving = new Set<string>()
  const resolved = new Map<string, ExpenseCategory>()
  const resolve = (category: ExpenseCategory): ExpenseCategory => {
    if (resolved.has(category.id)) return resolved.get(category.id)!
    if (category.defaultNecessity || !category.parentId || resolving.has(category.id)) { resolved.set(category.id, category); return category }
    resolving.add(category.id)
    const parent = byId.get(category.parentId)
    const parentResolved = parent ? resolve(parent) : undefined
    resolving.delete(category.id)
    const next = parentResolved?.defaultNecessity ? { ...category, defaultNecessity: parentResolved.defaultNecessity } : category
    resolved.set(category.id, next)
    return next
  }
  return categories.map(resolve)
}

function normalize(state: FinanceState): FinanceState {
  return {
    ...state,
    expenseCategories: materializeCategoryNecessity(state.expenseCategories ?? []),
    expenseBeneficiaries: state.expenseBeneficiaries ?? [],
    positions: state.positions ?? [],
    capitalCycles: state.capitalCycles ?? [],
  }
}

function loadInitial(): FinanceState { return normalize(repository.load() ?? emptyState) }

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(loadInitial)
  const persist = (next: FinanceState) => { const normalized = normalize(next); setState(normalized); repository.save(normalized) }

  const value = useMemo<FinanceContextValue>(() => ({
    state,
    convert: (input) => persist(applyManagedConversion(state, input)),
    addAccount: (input) => persist(addAccount(state, input)),
    addFunds: (input) => persist(addFunds(state, input)),
    addExistingAsset: (input) => persist(addExistingAsset(state, input)),
    purchaseAsset: (input) => persist(purchaseAssetSimplified(state, input)),
    transferFunds: (input) => persist(transferFunds(state, input)),
    createPortfolio: (input) => persist(createPortfolio(state, input)),
    allocateToPortfolio: (input) => persist(allocateToPortfolio(state, input)),
    updateHoldingQuote: (holdingId, quote) => persist(applyHoldingMarketQuote(state, holdingId, quote)),
    createParty: (input) => persist(createParty(state, input)),
    createExpenseCategory: (input) => persist(createExpenseCategory(state, input)),
    updateExpenseCategory: (input) => persist(updateExpenseCategory(state, input)),
    archiveExpenseCategory: (categoryId) => persist(archiveExpenseCategory(state, categoryId)),
    createExpenseBeneficiary: (input) => persist(createExpenseBeneficiary(state, input)),
    updateExpenseBeneficiary: (input) => persist(updateExpenseBeneficiary(state, input)),
    archiveExpenseBeneficiary: (beneficiaryId) => persist(archiveExpenseBeneficiary(state, beneficiaryId)),
    spendExpense: (input) => persist(spendExpense(state, input)),
    importSnapshot: (raw) => persist(parseSnapshot(raw)),
    runScenario: (id) => persist(runScenario(state, id)),
    loadDemo: () => { repository.clear(); persist(seedState) },
    reset: () => { repository.clear(); persist(emptyState) },
  }), [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
