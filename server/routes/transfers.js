import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/transfers
router.get('/', async (req, res) => {
  try {
    const { center_id, status } = req.query
    let sql = 'SELECT * FROM transfers WHERE 1=1'
    const params = []

    if (status) { params.push(status); sql += ` AND status = $${params.length}` }
    if (center_id) {
      params.push(center_id)
      sql += ` AND (from_center = $${params.length} OR to_center = $${params.length})`
    }

    sql += ' ORDER BY created_at DESC'
    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/transfers
router.post('/', async (req, res) => {
  try {
    const t = req.body
    const { rows: existing } = await query('SELECT COUNT(*) FROM transfers')
    const nextNum = parseInt(existing[0].count) + 1
    const newId = `TRF-${String(nextNum).padStart(3, '0')}`

    const { rows } = await query(`
      INSERT INTO transfers (id,asset_id,asset_name,from_center,to_center,quantity,reason,new_location,new_custodian,initiated_by,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending Approval') RETURNING *
    `, [newId, t.asset_id, t.asset_name, t.from_center, t.to_center, t.quantity || 1, t.reason, t.new_location, t.new_custodian, t.initiated_by])

    await query(
      'UPDATE assets SET status=$1, updated_at=NOW() WHERE id=$2',
      ['Pending Transfer', t.asset_id]
    )

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Transfer Initiated', t.asset_id, t.asset_name, t.from_center, t.initiated_by || 'System', `To: ${t.to_center}`]
    )

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[transfers POST]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/transfers/:id/approve
router.patch('/:id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body
    const today = new Date().toISOString().split('T')[0]
    const { rows } = await query(`
      UPDATE transfers SET status='In Transit', approved_by=$1, dispatched_date=$2
      WHERE id=$3 RETURNING *
    `, [approved_by, today, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Transfer not found' })

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Transfer Approved', rows[0].asset_id, rows[0].asset_name, rows[0].from_center, approved_by || 'System', `Approved to ${rows[0].to_center}`]
    )

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/transfers/:id/complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const { confirmed_by } = req.body
    const today = new Date().toISOString().split('T')[0]
    const { rows } = await query(`
      UPDATE transfers SET status='Completed', received_date=$1, transfer_date=$1
      WHERE id=$2 RETURNING *
    `, [today, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Transfer not found' })

    const t = rows[0]
    const { rows: centers } = await query('SELECT name FROM centers WHERE id=$1', [t.to_center])
    const centerName = centers[0]?.name || t.to_center

    await query(`
      UPDATE assets SET center_id=$1, center_name=$2, status='Active',
        location=COALESCE($3, location), custodian=COALESCE($4, custodian), updated_at=NOW()
      WHERE id=$5
    `, [t.to_center, centerName, t.new_location, t.new_custodian, t.asset_id])

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Transfer Completed', t.asset_id, t.asset_name, t.to_center, confirmed_by || 'System', `Received at ${t.to_center}`]
    )

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
