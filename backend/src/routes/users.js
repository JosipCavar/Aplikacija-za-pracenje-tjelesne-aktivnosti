import { Router } from 'express'
import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'

const r = Router()

// ✅ koristimo password_hash umjesto password
const PASS_COL = 'password_hash'

// GET /api/users/me — dohvat profila
r.get('/me', auth(), async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT id, username, email, role FROM users WHERE id = ?',
    [req.user.id]
  )
  if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen' })
  res.json(user)
})

// PUT /api/users/me — ažuriranje imena ili emaila
r.put('/me', auth(), async (req, res) => {
  const { username, email } = req.body || {}

  await pool.query(
    `UPDATE users
     SET username = COALESCE(?, username),
         email    = COALESCE(?, email)
     WHERE id = ?`,
    [username || null, email || null, req.user.id]
  )

  const [[updated]] = await pool.query(
    'SELECT id, username, email, role FROM users WHERE id = ?',
    [req.user.id]
  )

  res.json(updated)
})

// ✅ PUT /api/users/me/password — promjena lozinke
r.put('/me/password', auth(), async (req, res) => {
  const { current_password, new_password } = req.body || {}

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Nedostaju polja' })
  }

  if (String(new_password).length < 6) {
    return res.status(422).json({ message: 'Nova lozinka mora imati barem 6 znakova' })
  }

  const [[user]] = await pool.query(
    `SELECT id, ${PASS_COL} AS pass FROM users WHERE id = ?`,
    [req.user.id]
  )

  if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen' })

  const match = await bcrypt.compare(current_password, user.pass)
  if (!match) return res.status(401).json({ message: 'Trenutna lozinka nije točna' })

  const hash = await bcrypt.hash(new_password, 10)
  await pool.query(`UPDATE users SET ${PASS_COL}=? WHERE id=?`, [hash, req.user.id])

  res.json({ ok: true, message: 'Lozinka je uspješno promijenjena' })
})

export default r
