import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { fileURLToPath } from 'url'
import path from 'path'

import authRoute       from './routes/auth.route.js'
import employeesRoute  from './routes/employees.route.js'
import accountsRoute   from './routes/accounts.route.js'
import vetDiagnosisRoute from './routes/vetDiagnosis.route.js'
import pigReportsRoute from './routes/pigReports.route.js'
import barnsRoute      from './routes/barns.route.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = Fastify({ logger: true })

// ── Plugins ──────────────────────────────────────────────
await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

// Upload file — tối đa 5MB mỗi file
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Serve ảnh tĩnh từ thư mục uploads/
await app.register(staticFiles, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
})

// ── Routes ───────────────────────────────────────────────
app.register(authRoute,        { prefix: '/api/auth' })
app.register(employeesRoute,   { prefix: '/api/employees' })
app.register(accountsRoute,    { prefix: '/api/accounts' })
app.register(vetDiagnosisRoute,{ prefix: '/api/vet-diagnosis' })
app.register(pigReportsRoute,  { prefix: '/api/pig-reports' })
app.register(barnsRoute,       { prefix: '/api/barns' })

// ── Health check ─────────────────────────────────────────
app.get('/api/health', async () => ({ status: 'ok' }))

// ── Start ────────────────────────────────────────────────
try {
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
