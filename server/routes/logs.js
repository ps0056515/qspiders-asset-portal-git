import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/logs
router.get('/', async (req, res) => {
  try {
    const { asset_id, center, limit = 50 } = req.query
    let sql = 'SELECT id, action, asset_id, asset_name, center, actor AS "user", timestamp, details FROM audit_logs WHERE 1=1'
    const params = []

    if (asset_id) { params.push(asset_id); sql += ` AND asset_id = $${params.length}` }
    if (center)   { params.push(center);   sql += ` AND center = $${params.length}` }

    params.push(parseInt(limit))
    sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
