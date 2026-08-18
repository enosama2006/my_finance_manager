import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ConversionInput, ExpenseCategory, FinanceState } from '../domain/types'
import type { MarketQuote } from '../data/marketData'
import { parseSnapshot } from '../data/snapshot'
import { seedState } from '../data/seed'
import { emptyState } from '../data/emptyState'
import { createLocalStorageFinanceRepository } from '../data/localStorageRepository'
import { runScenario, type ScenarioId } from './scenarios'
import { applyManagedConversion } from './conversionPolicy'
import { addExistingAsset, addFunds, allocateToPortfolio, createPortfolio, transferFunds, type AddFundsInput, type AllocateToPortfolioInput, type CreatePortfolioInput, type ExistingAssetInput, type TransferFundsInput } from './commands'
import { archiveAccountGroup, createAccountGroup, createGroupedAccount, moveAccountToGroup, updateAccount, updateAccountGroup, type CreateAccountGroupInput, type CreateGroupedAccountInput, type UpdateAccountGroupInput, type UpdateAccountInput } from './accountGroups'
import { archiveAssetCorrection, flattenLegacyAccountsToAssets, moveAssetToGroup, type CreateAssetInput } from './assets'
import { updateAssetFull, type UpdateAssetFullInput } from './assetEditing'
import { addIncomeToAsset, createAssetWithOpening, setAssetOpeningBalance, transferBetweenAssets, type AddAssetIncomeInput, type SetAssetOpeningBalanceInput, type TransferBetweenAssetsInput } from './assetTransactions'
import { applyHoldingMarketQuote, purchaseAssetSimplified, type SimplifiedPurchaseInput } from './purchase'
import { archivePortfolio, updatePortfolio, type UpdatePortfolioInput } from './portfolios'
import { archiveExpenseBeneficiary, archiveExpenseCategory, createExpenseBeneficiary, createExpenseCategory, createParty, spendExpense, updateExpenseBeneficiary, updateExpenseCategory, type CreateExpenseBeneficiaryInput, type CreateExpenseCategoryInput, type CreatePartyInput, type SpendExpenseInput, type UpdateExpenseBeneficiaryInput, type UpdateExpenseCategoryInput } from './expenses'
import { reviseTransaction, type ReviseTransactionInput } from './transactionRevisions'
import { setOpeningBalance, voidOpeningBalance } from './openingBalances'
import { correctAssetPurchase, voidAssetPurchase, type CorrectAssetPurchaseInput } from './assetPurchaseCorrections'
import { correctAllocation, correctConversion, correctExpense, correctIncome, correctOpening, correctTransfer, type CorrectAllocationInput, type CorrectConversionInput, type CorrectExpenseInput, type CorrectIncomeInput, type CorrectOpeningInput, type CorrectTransferInput } from './simpleTransactionCorrections'
import { hydrateTransactionUserInputs } from './transactionInputMigration'
import { voidTransaction } from './transactionVoids'

interface FinanceContextValue {
  state: FinanceState
  convert: (input: ConversionInput) => void
  createAsset: (input: CreateAssetInput) => void
  updateAsset: (input: UpdateAssetFullInput) => void
  moveAssetToGroup: (assetId: string, groupId?: string) => void
  deleteAsset: (assetId: string, reason: string) => void
  setAssetOpeningBalance: (input: SetAssetOpeningBalanceInput) => void
  addIncomeToAsset: (input: AddAssetIncomeInput) => void
  transferBetweenAssets: (input: TransferBetweenAssetsInput) => void
  createAccountGroup: (input: CreateAccountGroupInput) => void
  updateAccountGroup: (input: UpdateAccountGroupInput) => void
  archiveAccountGroup: (groupId: string) => void
  addAccount: (input: CreateGroupedAccountInput) => void
  updateAccount: (input: UpdateAccountInput) => void
  moveAccountToGroup: (accountId: string, groupId?: string) => void
  addFunds: (input: AddFundsInput) => void
  addExistingAsset: (input: ExistingAssetInput) => void
  transferFunds: (input: TransferFundsInput) => void
  voidOpeningBalance: (transactionId: string, reason: string) => void
  purchaseAsset: (input: SimplifiedPurchaseInput) => void
  correctAssetPurchase: (input: CorrectAssetPurchaseInput) => void
  voidAssetPurchase: (transactionId: string, reason: string) => void
  correctOpening: (input: CorrectOpeningInput) => void
  correctExpense: (input: CorrectExpenseInput) => void
  correctIncome: (input: CorrectIncomeInput) => void
  correctTransfer: (input: CorrectTransferInput) => void
  correctAllocation: (input: CorrectAllocationInput) => void
  correctConversion: (input: CorrectConversionInput) => void
  voidTransaction: (transactionId: string, reason: string) => void
  createPortfolio: (input: CreatePortfolioInput) => void
  updatePortfolio: (input: UpdatePortfolioInput) => void
  archivePortfolio: (portfolioId: string) => void
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
  reviseTransaction: (input: ReviseTransactionInput) => void
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

function migrateLegacyPlacesToGroups(state: FinanceState): FinanceState {
  let accountGroups = [...(state.accountGroups ?? [])]
  let accounts = [...state.accounts]
  const selfId = state.parties.find(p => p.type === 'self')?.id
  for (const account of accounts) {
    if (account.groupId || account.custodianId === selfId) continue
    const legacy = state.parties.find(p => p.id === account.custodianId && p.type !== 'self' && p.type !== 'person')
    if (!legacy) continue
    const groupId = `legacy-group-${legacy.id}`
    if (!accountGroups.some(g => g.id === groupId)) accountGroups.push({ id: groupId, name: legacy.name, status: 'active', description: 'تم تحويله تلقائيًا من طبقة المكان القديمة إلى مجموعة تنظيمية.', createdAt: new Date().toISOString() })
    accounts = accounts.map(a => a.id === account.id ? { ...a, groupId } : a)
  }
  return { ...state, accountGroups, accounts }
}

function normalize(state: FinanceState): FinanceState {
  const withGroups = migrateLegacyPlacesToGroups(state)
  const withInputs = hydrateTransactionUserInputs(withGroups)
  const migrated = flattenLegacyAccountsToAssets(withInputs)
  return { ...migrated, schemaVersion: 5, accountGroups: migrated.accountGroups ?? [], expenseCategories: materializeCategoryNecessity(migrated.expenseCategories ?? []), expenseBeneficiaries: migrated.expenseBeneficiaries ?? [], positions: migrated.positions ?? [], capitalCycles: migrated.capitalCycles ?? [] }
}
function loadInitial() { return normalize(repository.load() ?? emptyState) }

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(loadInitial)
  const persist = (next: FinanceState) => { const normalized = normalize(next); setState(normalized); repository.save(normalized) }

  const value = useMemo<FinanceContextValue>(() => ({
    state,
    convert: input => persist(applyManagedConversion(state, input)),
    createAsset: input => persist(createAssetWithOpening(state, input)),
    updateAsset: input => persist(updateAssetFull(state, input)),
    moveAssetToGroup: (id, groupId) => persist(moveAssetToGroup(state, id, groupId)),
    deleteAsset: (assetId, reason) => {
      const refs = state.ledger.filter(tx => tx.status === 'posted' && (tx.sourceHoldingId === assetId || tx.targetHoldingId === assetId))
      const purchase = refs.find(tx => tx.kind === 'asset_purchase' && tx.targetHoldingId === assetId)
      if (purchase && refs.length === 1) { persist(voidAssetPurchase(state, purchase.id, reason)); return }
      const opening = refs.find(tx => tx.kind === 'opening' && tx.targetHoldingId === assetId)
      if (opening && refs.length === 1) {
        const reversed = voidOpeningBalance(state, opening.id, reason)
        persist(archiveAssetCorrection(reversed, assetId, reason))
        return
      }
      if (refs.length === 0) { persist(archiveAssetCorrection(state, assetId, reason)); return }
      throw new Error('للأصل حركات مالية نشطة. احذف/ألغِ الحركات المرتبطة به من سجل الحركات أولًا، ثم احذف الأصل.')
    },
    setAssetOpeningBalance: input => persist(setAssetOpeningBalance(state, input)),
    addIncomeToAsset: input => persist(addIncomeToAsset(state, input)),
    transferBetweenAssets: input => persist(transferBetweenAssets(state, input)),
    createAccountGroup: input => persist(createAccountGroup(state, input)),
    updateAccountGroup: input => persist(updateAccountGroup(state, input)),
    archiveAccountGroup: id => persist(archiveAccountGroup(state, id)),
    addAccount: input => persist(createGroupedAccount(state, input)),
    updateAccount: input => persist(updateAccount(state, input)),
    moveAccountToGroup: (id, groupId) => persist(moveAccountToGroup(state, id, groupId)),
    addFunds: input => persist(input.classification === 'opening' ? setOpeningBalance(state, input) : addFunds(state, input)),
    addExistingAsset: input => persist(addExistingAsset(state, input)),
    transferFunds: input => persist(transferFunds(state, input)),
    voidOpeningBalance: (id, reason) => persist(voidOpeningBalance(state, id, reason)),
    purchaseAsset: input => persist(purchaseAssetSimplified(state, input)),
    correctAssetPurchase: input => persist(correctAssetPurchase(state, input)),
    voidAssetPurchase: (id, reason) => persist(voidAssetPurchase(state, id, reason)),
    correctOpening: input => persist(correctOpening(state, input)),
    correctExpense: input => persist(correctExpense(state, input)),
    correctIncome: input => persist(correctIncome(state, input)),
    correctTransfer: input => persist(correctTransfer(state, input)),
    correctAllocation: input => persist(correctAllocation(state, input)),
    correctConversion: input => persist(correctConversion(state, input)),
    voidTransaction: (id, reason) => persist(voidTransaction(state, id, reason)),
    createPortfolio: input => persist(createPortfolio(state, input)),
    updatePortfolio: input => persist(updatePortfolio(state, input)),
    archivePortfolio: id => persist(archivePortfolio(state, id)),
    allocateToPortfolio: input => persist(allocateToPortfolio(state, input)),
    updateHoldingQuote: (id, quote) => persist(applyHoldingMarketQuote(state, id, quote)),
    createParty: input => persist(createParty(state, input)),
    createExpenseCategory: input => persist(createExpenseCategory(state, input)),
    updateExpenseCategory: input => persist(updateExpenseCategory(state, input)),
    archiveExpenseCategory: id => persist(archiveExpenseCategory(state, id)),
    createExpenseBeneficiary: input => persist(createExpenseBeneficiary(state, input)),
    updateExpenseBeneficiary: input => persist(updateExpenseBeneficiary(state, input)),
    archiveExpenseBeneficiary: id => persist(archiveExpenseBeneficiary(state, id)),
    spendExpense: input => persist(spendExpense(state, input)),
    reviseTransaction: input => persist(reviseTransaction(state, input)),
    importSnapshot: raw => persist(parseSnapshot(raw)),
    runScenario: id => persist(runScenario(state, id)),
    loadDemo: () => { repository.clear(); persist(seedState) },
    reset: () => { repository.clear(); persist(emptyState) },
  }), [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() { const ctx = useContext(FinanceContext); if (!ctx) throw new Error('useFinance must be used within FinanceProvider'); return ctx }
