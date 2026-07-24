import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import assetsRouter from './routes/assets.js'
import transfersRouter from './routes/transfers.js'
import maintenanceRouter from './routes/maintenance.js'
import logsRouter from './routes/logs.js'
import authRouter from './routes/auth.js'
import scanRouter from './routes/scan.js'
import uploadsRouter, { UPLOADS_DIR } from './routes/uploads.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config()

const app = express()
// Use API_PORT only — a generic PORT=3001 in .env (or tooling) must not override the API bind port.
const PORT = Number(process.env.API_PORT || 5355)

app.use(
  cors({
    origin: [
      'http://localhost:5353',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
  })
)
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

app.use('/api/assets', assetsRouter)
app.use('/api/transfers', transfersRouter)
app.use('/api/maintenance', maintenanceRouter)
app.use('/api/logs', logsRouter)
app.use('/api/auth', authRouter)
app.use('/api/scan', scanRouter)
app.use('/api/uploads', uploadsRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// Serve built frontend in production
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Start server after DB is ready
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('[Server] API running on http://localhost:${PORT}')
    })
  })
  .catch((err) => {
    console.error('[Server] Failed to initialise database:', err.message)
    process.exit(1)
  })