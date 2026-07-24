import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

const KNOWN_CAT_CODES = {
  'IT & Electronics': 'IT',
  Furniture: 'FURN',
  'HVAC & Electrical': 'HVAC',
  Infrastructure: 'INFRA',
  Other: 'OTH',
}

function categoryCode(category = '') {
  if (KNOWN_CAT_CODES[category]) return KNOWN_CAT_CODES[category]
  const cleaned = String(category).replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return (cleaned.slice(0, 4) || 'CUST')
}

async function nextAssetId(centerId, category) {
  const catCode = categoryCode(category)
  const prefix = `QS-${centerId}-${catCode}-`
  const { rows } = await query(
    `SELECT id FROM assets WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  )
  let nextNum = 1
  if (rows[0]?.id) {
    const match = String(rows[0].id).match(/-(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

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
      sql += ` AND (LOWER(asset_name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length} OR LOWER(serial_no) LIKE $${params.length} OR LOWER(custodian) LIKE $${params.length} OR LOWER(make_brand) LIKE $${params.length} OR LOWER(COALESCE(employee_name,'')) LIKE $${params.length} OR LOWER(COALESCE(employee_id,'')) LIKE $${params.length})`
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
    if (!a.asset_name?.trim()) return res.status(400).json({ error: 'Asset name is required' })
    if (!a.category?.trim()) return res.status(400).json({ error: 'Category is required' })
    if (!a.center_id) return res.status(400).json({ error: 'Center is required' })

    const assetType = a.asset_type === 'employee' ? 'employee' : 'common'
    if (assetType === 'employee') {
      if (!a.employee_name?.trim()) return res.status(400).json({ error: 'Employee name is required' })
      if (!a.employee_id?.trim()) return res.status(400).json({ error: 'Employee ID is required' })
    }

    const newId = await nextAssetId(a.center_id, a.category)

    const { rows: centers } = await query('SELECT name FROM centers WHERE id = $1', [a.center_id])
    const centerName = centers[0]?.name || a.center_id

    const { rows } = await query(`
      INSERT INTO assets (
        id, asset_name, category, sub_category, make_brand, model_no, serial_no,
        center_id, center_name, location, quantity, condition, status,
        purchase_date, purchase_value, vendor, warranty_start, warranty_expiry,
        custodian, department, last_verified, verified_by, photo_url, invoice_url,
        asset_type, employee_name, employee_id, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING *
    `, [
      newId,
      a.asset_name,
      a.category,
      a.sub_category || null,
      a.make_brand || null,
      a.model_no || null,
      a.serial_no || null,
      a.center_id,
      centerName,
      a.location || null,
      a.quantity || 1,
      a.condition || 'Good',
      a.status || 'Active',
      a.purchase_date || null,
      a.purchase_value || null,
      a.vendor || null,
      a.warranty_start || null,
      a.warranty_expiry || null,
      a.custodian || (assetType === 'employee' ? a.employee_name : null),
      a.department || null,
      new Date().toISOString().split('T')[0],
      a.verified_by || a.custodian || a.employee_name || null,
      a.photo_url || null,
      a.invoice_url || null,
      assetType,
      assetType === 'employee' ? a.employee_name : null,
      assetType === 'employee' ? a.employee_id : null,
      a.notes || null,
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
    const assetType = a.asset_type === 'employee' ? 'employee' : 'common'
    if (assetType === 'employee') {
      if (!a.employee_name?.trim()) return res.status(400).json({ error: 'Employee name is required' })
      if (!a.employee_id?.trim()) return res.status(400).json({ error: 'Employee ID is required' })
    }

    const { rows } = await query(`
      UPDATE assets SET
        asset_name=$1, category=$2, sub_category=$3, make_brand=$4, model_no=$5,
        serial_no=$6, location=$7, quantity=$8, condition=$9, status=$10,
        purchase_date=$11, purchase_value=$12, vendor=$13, warranty_start=$14,
        warranty_expiry=$15, custodian=$16, department=$17, notes=$18,
        photo_url=$19, invoice_url=$20, asset_type=$21, employee_name=$22,
        employee_id=$23, updated_at=NOW()
      WHERE id=$24 RETURNING *
    `, [
      a.asset_name, a.category, a.sub_category, a.make_brand, a.model_no,
      a.serial_no, a.location, a.quantity, a.condition, a.status,
      a.purchase_date || null, a.purchase_value || null, a.vendor,
      a.warranty_start || null, a.warranty_expiry || null,
      a.custodian, a.department, a.notes,
      a.photo_url || null, a.invoice_url || null, assetType,
      assetType === 'employee' ? a.employee_name : null,
      assetType === 'employee' ? a.employee_id : null,
      req.params.id,
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
