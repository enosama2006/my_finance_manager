import type { FinanceState } from '../domain/types'

export interface MyFinManSnapshot {
  format: 'myfinman-snapshot'
  version: 1
  exportedAt: string
  schemaVersion: FinanceState['schemaVersion']
  state: FinanceState
}

export function createSnapshot(state: FinanceState): MyFinManSnapshot {
  return { format: 'myfinman-snapshot', version: 1, exportedAt: new Date().toISOString(), schemaVersion: state.schemaVersion, state }
}

export function parseSnapshot(raw: string): FinanceState {
  const parsed = JSON.parse(raw) as Partial<MyFinManSnapshot>
  if (parsed.format !== 'myfinman-snapshot' || parsed.version !== 1 || !parsed.state) throw new Error('الملف ليس نسخة MyFinMan مدعومة')
  const state = parsed.state as FinanceState
  if (state.schemaVersion !== 4 && state.schemaVersion !== 5) throw new Error(`إصدار البيانات ${state.schemaVersion} غير مدعوم في هذه النسخة`)
  if (!Array.isArray(state.parties) || !Array.isArray(state.accounts) || !Array.isArray(state.holdings) || !Array.isArray(state.portfolios) || !Array.isArray(state.ledger)) throw new Error('ملف البيانات ناقص أو تالف')
  return state
}

export function downloadSnapshot(state: FinanceState) {
  const snapshot = createSnapshot(state)
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `myfinman-${stamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
