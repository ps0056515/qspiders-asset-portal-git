import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const { rows } = await query(
      'SELECT id, name, email, role, center_id, center_name FROM users WHERE email=$1 AND password_hash=$2',
      [email, password]
    )

    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' })

    res.json(rows[0])
  } catch (err) {
    console.error('[auth login]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, name, email, role, center_id, center_name, created_at FROM users ORDER BY role, name')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
