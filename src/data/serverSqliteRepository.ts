import type { FinanceState } from '../domain/types'

export interface ServerStorageStatus {
  online: boolean
  engine: 'sqlite-file' | 'unavailable'
  databaseFile?: string
  storageSchemaVersion?: number
  hasState: boolean
  financeSchemaVersion?: number | null
  updatedAt?: string | null
  migrationCount?: number
}

interface ApiEnvelope<T = unknown> {
  ok: boolean
  state?: FinanceState
  status?: T
  message?: string
  code?: string
  engine?: 'sqlite-file'
  databaseFile?: string
  storageSchemaVersion?: number
  hasState?: boolean
  financeSchemaVersion?: number | null
  updatedAt?: string | null
  migrationCount?: number
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>
  if (!response.ok) {
    const error = new Error(body.message || `فشل الاتصال بقاعدة البيانات (${response.status})`) as Error & { code?: string; status?: number }
    error.code = body.code
    error.status = response.status
    throw error
  }
  return body
}

export function createServerSqliteFinanceRepository() {
  let writeQueue: Promise<void> = Promise.resolve()
  const serializeWrite = (work: () => Promise<void>) => {
    const next = writeQueue.then(work, work)
    writeQueue = next.catch(() => undefined)
    return next
  }

  return {
    async status(): Promise<ServerStorageStatus> {
      try {
        const body = await api('/api/storage/status')
        return {
          online: true,
          engine: body.engine ?? 'sqlite-file',
          databaseFile: body.databaseFile,
          storageSchemaVersion: body.storageSchemaVersion,
          hasState: body.hasState ?? false,
          financeSchemaVersion: body.financeSchemaVersion,
          updatedAt: body.updatedAt,
          migrationCount: body.migrationCount,
        }
      } catch {
        return { online: false, engine: 'unavailable', hasState: false }
      }
    },

    async load(): Promise<FinanceState | null> {
      await writeQueue
      try {
        const body = await api('/api/state')
        return body.state ?? null
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null
        throw error
      }
    },

    save(state: FinanceState): Promise<void> {
      const payload = JSON.stringify({ state })
      return serializeWrite(async () => {
        await api('/api/state', { method: 'PUT', body: payload })
      })
    },

    async migrate(state: FinanceState): Promise<ServerStorageStatus> {
      await writeQueue
      const body = await api<ServerStorageStatus>('/api/storage/migrate', {
        method: 'POST',
        body: JSON.stringify({ state, source: 'legacy-browser', note: 'Explicit migration initiated by the user from MyFinMan.' }),
      })
      return { online: true, engine: 'sqlite-file', hasState: true, ...(body.status ?? {}) }
    },

    async checkpoint(id: string, state: FinanceState, createdAt: string): Promise<void> {
      await writeQueue
      await api('/api/storage/checkpoint', { method: 'POST', body: JSON.stringify({ id, state, createdAt }) })
    },

    clear(): Promise<void> {
      return serializeWrite(async () => {
        await api('/api/state', { method: 'DELETE' })
      })
    },
  }
}
