import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import assetsRouter from './routes/assets.js'
import transfersRouter from './routes/transfers.js'
import maintenanceRouter from './routes/maintenance.js'
import logsRouter from './routes/logs.js'
import authRouter from './routes/auth.js'
import scanRouter from './routes/scan.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }))
app.use(express.json())

app.use('/api/assets', assetsRouter)
app.use('/api/transfers', transfersRouter)
app.use('/api/maintenance', maintenanceRouter)
app.use('/api/logs', logsRouter)
app.use('/api/auth', authRouter)
app.use('/api/scan', scanRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// Start server after DB is ready
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] API running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[Server] Failed to initialise database:', err.message)
    process.exit(1)
  })
