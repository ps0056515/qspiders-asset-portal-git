import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const { center_id, status } = req.query
    let sql = 'SELECT * FROM maintenance_records WHERE 1=1'
    const params = []

    if (center_id) { params.push(center_id); sql += ` AND center_id = $${params.length}` }
    if (status)    { params.push(status);    sql += ` AND status = $${params.length}` }

    sql += ' ORDER BY created_at DESC'
    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/maintenance
router.post('/', async (req, res) => {
  try {
    const m = req.body
    const { rows: existing } = await query('SELECT COUNT(*) FROM maintenance_records')
    const nextNum = parseInt(existing[0].count) + 1
    const newId = `MNT-${String(nextNum).padStart(3, '0')}`

    const { rows } = await query(`
      INSERT INTO maintenance_records (id,asset_id,asset_name,center_id,issue,vendor,technician,start_date,expected_return,estimated_cost,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'In Progress') RETURNING *
    `, [newId, m.asset_id, m.asset_name, m.center_id, m.issue, m.vendor, m.technician, m.start_date || null, m.expected_return || null, m.estimated_cost || 0])

    await query('UPDATE assets SET status=$1, updated_at=NOW() WHERE id=$2', ['Under Maintenance', m.asset_id])

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Maintenance Started', m.asset_id, m.asset_name, m.center_id, m.logged_by || 'System', m.issue]
    )

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[maintenance POST]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/maintenance/:id/complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const { actual_cost, new_condition, completed_by } = req.body
    const today = new Date().toISOString().split('T')[0]

    const { rows } = await query(`
      UPDATE maintenance_records SET status='Completed', actual_return=$1, actual_cost=$2
      WHERE id=$3 RETURNING *
    `, [today, actual_cost || 0, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Record not found' })

    await query(`
      UPDATE assets SET status='Active', condition=COALESCE($1, condition), updated_at=NOW() WHERE id=$2
    `, [new_condition, rows[0].asset_id])

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Maintenance Completed', rows[0].asset_id, rows[0].asset_name, rows[0].center_id, completed_by || 'System', `Returned. Cost: ₹${actual_cost}`]
    )

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
