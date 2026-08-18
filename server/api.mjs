import { createServer } from 'node:http'
import { DEFAULT_DATABASE_PATH, clearState, createExportCheckpoint, migrateState, openMyFinManDatabase, readState, storageStatus, writeState } from './database.mjs'

const HOST = process.env.MYFINMAN_API_HOST || '127.0.0.1'
const PORT = Number(process.env.MYFINMAN_API_PORT || 8787)
const MAX_BODY = 50 * 1024 * 1024
const db = openMyFinManDatabase()

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('حجم البيانات أكبر من الحد المسموح'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('JSON غير صالح'))
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`)
  try {
    if (req.method === 'GET' && url.pathname === '/api/storage/status') {
      sendJson(res, 200, { ok: true, ...storageStatus(db, DEFAULT_DATABASE_PATH) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      const state = readState(db)
      if (!state) { sendJson(res, 404, { ok: false, code: 'STATE_NOT_FOUND' }); return }
      sendJson(res, 200, { ok: true, state })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/state') {
      const { state } = await readJson(req)
      writeState(db, state)
      sendJson(res, 200, { ok: true, status: storageStatus(db, DEFAULT_DATABASE_PATH) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/storage/migrate') {
      const { state, source, note } = await readJson(req)
      migrateState(db, state, source || 'legacy-browser', note || 'Explicit migration initiated from MyFinMan UI.')
      sendJson(res, 201, { ok: true, status: storageStatus(db, DEFAULT_DATABASE_PATH) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/storage/checkpoint') {
      const { id, state, createdAt } = await readJson(req)
      if (!id || typeof id !== 'string') throw new Error('checkpoint id مطلوب')
      createExportCheckpoint(db, id, state, createdAt)
      sendJson(res, 201, { ok: true })
      return
    }

    if (req.method === 'DELETE' && url.pathname === '/api/state') {
      clearState(db)
      sendJson(res, 200, { ok: true })
      return
    }

    sendJson(res, 404, { ok: false, code: 'NOT_FOUND' })
  } catch (error) {
    const conflict = error?.code === 'SQLITE_ALREADY_INITIALIZED'
    sendJson(res, conflict ? 409 : 400, {
      ok: false,
      code: error?.code || 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : 'تعذر تنفيذ الطلب',
    })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[MyFinMan API] http://${HOST}:${PORT}`)
  console.log(`[MyFinMan SQLite] ${DEFAULT_DATABASE_PATH}`)
})

function shutdown() {
  server.close(() => {
    try { db.close() } finally { process.exit(0) }
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
