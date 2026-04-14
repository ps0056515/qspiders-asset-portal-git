import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/assets
router.get('/', async (req, res) => {
  try {
    const { center_id, category, status, condition, search } = req.query
    let sql = 'SELECT * FROM assets WHERE 1=1'
    const params = []

    if (center_id) { params.push(center_id); sql += ` AND center_id = $${params.length}` }
    if (category)  { params.push(category);  sql += ` AND category = $${params.length}` }
    if (status)    { params.push(status);     sql += ` AND status = $${params.length}` }
    if (condition) { params.push(condition);  sql += ` AND condition = $${params.length}` }
    if (search) {
      params.push(`%${search.toLowerCase()}%`)
      sql += ` AND (LOWER(asset_name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length} OR LOWER(serial_no) LIKE $${params.length} OR LOWER(custodian) LIKE $${params.length} OR LOWER(make_brand) LIKE $${params.length})`
    }

    sql += ' ORDER BY created_at DESC'
    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('[assets GET]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/assets/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM assets WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Asset not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/assets
router.post('/', async (req, res) => {
  try {
    const a = req.body
    // Generate ID
    const catCode = a.category === 'IT & Electronics' ? 'IT'
      : a.category === 'Furniture' ? 'FURN'
      : a.category === 'HVAC & Electrical' ? 'HVAC'
      : a.category === 'Infrastructure' ? 'INFRA' : 'OTH'
    const { rows: existing } = await query(
      'SELECT COUNT(*) FROM assets WHERE center_id = $1 AND category = $2',
      [a.center_id, a.category]
    )
    const nextNum = parseInt(existing[0].count) + 1
    const newId = `QS-${a.center_id}-${catCode}-${String(nextNum).padStart(4, '0')}`

    const { rows: centers } = await query('SELECT name FROM centers WHERE id = $1', [a.center_id])
    const centerName = centers[0]?.name || a.center_id

    const { rows } = await query(`
      INSERT INTO assets (id,asset_name,category,sub_category,make_brand,model_no,serial_no,
        center_id,center_name,location,quantity,condition,status,purchase_date,purchase_value,
        vendor,warranty_expiry,custodian,department,last_verified,verified_by,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `, [
      newId, a.asset_name, a.category, a.sub_category, a.make_brand, a.model_no, a.serial_no,
      a.center_id, centerName, a.location, a.quantity || 1, a.condition || 'Good',
      a.status || 'Active', a.purchase_date || null, a.purchase_value || null,
      a.vendor, a.warranty_expiry || null, a.custodian, a.department,
      new Date().toISOString().split('T')[0], a.verified_by || a.custodian, a.notes,
    ])

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Asset Added', newId, a.asset_name, a.center_id, a.created_by || 'System', 'New asset registered']
    )

    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[assets POST]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/assets/:id
router.put('/:id', async (req, res) => {
  try {
    const a = req.body
    const { rows } = await query(`
      UPDATE assets SET
        asset_name=$1, category=$2, sub_category=$3, make_brand=$4, model_no=$5,
        serial_no=$6, location=$7, quantity=$8, condition=$9, status=$10,
        purchase_date=$11, purchase_value=$12, vendor=$13, warranty_expiry=$14,
        custodian=$15, department=$16, notes=$17, updated_at=NOW()
      WHERE id=$18 RETURNING *
    `, [
      a.asset_name, a.category, a.sub_category, a.make_brand, a.model_no,
      a.serial_no, a.location, a.quantity, a.condition, a.status,
      a.purchase_date || null, a.purchase_value || null, a.vendor, a.warranty_expiry || null,
      a.custodian, a.department, a.notes, req.params.id,
    ])

    if (!rows.length) return res.status(404).json({ error: 'Asset not found' })

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Asset Edited', rows[0].id, rows[0].asset_name, rows[0].center_id, a.updated_by || 'System', 'Asset details updated']
    )

    res.json(rows[0])
  } catch (err) {
    console.error('[assets PUT]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/assets/:id/decommission — request decommission
router.patch('/:id/decommission', async (req, res) => {
  try {
    const { reason, requested_by } = req.body
    const { rows } = await query(`
      UPDATE assets SET status='Pending Decommission', decommission_reason=$1, updated_at=NOW()
      WHERE id=$2 RETURNING *
    `, [reason, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Asset not found' })

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Decommission Requested', rows[0].id, rows[0].asset_name, rows[0].center_id, requested_by || 'System', `Reason: ${reason}`]
    )

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/assets/:id/approve-decommission
router.patch('/:id/approve-decommission', async (req, res) => {
  try {
    const { approve, reject_reason, approved_by } = req.body
    const newStatus = approve ? 'Decommissioned' : 'Active'
    const { rows } = await query(`
      UPDATE assets SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *
    `, [newStatus, req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Asset not found' })

    await query(
      'INSERT INTO audit_logs (action,asset_id,asset_name,center,actor,details) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        approve ? 'Asset Decommissioned' : 'Decommission Rejected',
        rows[0].id, rows[0].asset_name, rows[0].center_id, approved_by || 'System',
        approve ? 'Approved and decommissioned' : `Rejected: ${reject_reason}`,
      ]
    )

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
