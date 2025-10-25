// backend/src/routes/stats.js
import { Router } from 'express'
import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'

const r = Router()

// 📊 Ukupno setova u zadnjih 30 dana
r.get('/total-sets-30d', auth(), async (req, res) => {
  try {
    const [[row]] = await pool.query(`
      SELECT COUNT(*) AS total_sets
      FROM workout_sets s
      JOIN workout_exercises wx ON wx.id = s.workout_exercise_id
      JOIN workouts w ON w.id = wx.workout_id
      WHERE w.user_id = ?
        AND w.workout_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [req.user.id])

    res.json({ total_sets: row?.total_sets || 0 })
  } catch (err) {
    console.error('GET /stats/total-sets-30d error:', err)
    res.status(500).json({ message: 'Greška na serveru' })
  }
})

export default r
