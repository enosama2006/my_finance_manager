import type { FinanceState } from '../domain/types'

export interface MyFinManSnapshot {
  format: 'myfinman-snapshot'
  version: 1
  exportedAt: string
  schemaVersion: FinanceState['schemaVersion']
  state: FinanceState
}

export interface MigrationSnapshotManifest {
  myfinmanFormat: 'myfinman-migration-snapshot'
  formatVersion: 1
  exportedAt: string
  schemaVersion: FinanceState['schemaVersion']
  storageEngine: 'sqlite'
}

export interface DownloadedSnapshotMeta {
  checkpointId: string
  exportedAt: string
  filename: string
}

export function createSnapshot(state: FinanceState, exportedAt = new Date().toISOString()): MyFinManSnapshot {
  return { format: 'myfinman-snapshot', version: 1, exportedAt, schemaVersion: state.schemaVersion, state }
}

export function createMigrationMarkdown(state: FinanceState, exportedAt = new Date().toISOString()): string {
  const snapshot = createSnapshot(state, exportedAt)
  const manifest: MigrationSnapshotManifest = {
    myfinmanFormat: 'myfinman-migration-snapshot',
    formatVersion: 1,
    exportedAt,
    schemaVersion: state.schemaVersion,
    storageEngine: 'sqlite',
  }
  return [
    '---',
    `myfinmanFormat: ${manifest.myfinmanFormat}`,
    `formatVersion: ${manifest.formatVersion}`,
    `exportedAt: ${manifest.exportedAt}`,
    `schemaVersion: ${manifest.schemaVersion}`,
    `storageEngine: ${manifest.storageEngine}`,
    '---',
    '',
    '# MyFinMan Migration Snapshot',
    '',
    '> هذا الملف هو وسيط ترحيل قابل للقراءة آليًا وبشريًا. لا تعدّل كتلة JSON إذا أردت استيرادًا lossless.',
    '',
    '## Machine-readable snapshot',
    '',
    '```json',
    JSON.stringify(snapshot, null, 2),
    '```',
    '',
  ].join('\n')
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) return trimmed
  const fenced = trimmed.match(/##\s+Machine-readable snapshot[\s\S]*?```json\s*([\s\S]*?)\s*```/i)
  if (!fenced?.[1]) throw new Error('ملف Markdown لا يحتوي كتلة MyFinMan JSON قابلة للاستيراد')
  return fenced[1].trim()
}

export function parseSnapshot(raw: string): FinanceState {
  const payload = extractJsonPayload(raw)
  const parsed = JSON.parse(payload) as Partial<MyFinManSnapshot>
  if (parsed.format !== 'myfinman-snapshot' || parsed.version !== 1 || !parsed.state) throw new Error('الملف ليس نسخة MyFinMan مدعومة')
  const state = parsed.state as FinanceState
  if (state.schemaVersion !== 4 && state.schemaVersion !== 5) throw new Error(`إصدار البيانات ${state.schemaVersion} غير مدعوم في هذه النسخة`)
  if (!Array.isArray(state.parties) || !Array.isArray(state.accounts) || !Array.isArray(state.holdings) || !Array.isArray(state.portfolios) || !Array.isArray(state.ledger)) throw new Error('ملف البيانات ناقص أو تالف')
  return state
}

export function downloadSnapshot(state: FinanceState): DownloadedSnapshotMeta {
  const exportedAt = new Date().toISOString()
  const checkpointId = `export-${exportedAt}`
  const markdown = createMigrationMarkdown(state, exportedAt)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = exportedAt.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `myfinman-migration-${stamp}.md`
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return { checkpointId, exportedAt, filename }
}
