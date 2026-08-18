import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const children = []
let shuttingDown = false

function start(label, command, args) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env })
  children.push(child)
  child.on('exit', code => {
    if (shuttingDown) return
    if (code && code !== 0) console.error(`[${label}] exited with code ${code}`)
    shutdown(code ?? 0)
  })
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  setTimeout(() => process.exit(code), 150)
}

start('api', process.execPath, ['server/api.mjs'])
start('web', process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '0.0.0.0'])

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
