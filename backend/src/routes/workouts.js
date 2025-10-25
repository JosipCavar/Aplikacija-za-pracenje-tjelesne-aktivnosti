import { Router } from 'express'
import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'

const r = Router()

/* ----------------------------- Helpers ----------------------------- */
async function getWorkoutForUser (workoutId, userId) {
  const [[w]] = await pool.query(
    'SELECT * FROM workouts WHERE id=? AND user_id=?',
    [workoutId, userId]
  )
  return w || null
}

async function getItemForUser (itemId, userId) {
  const [[wx]] = await pool.query(
    `
    SELECT wx.*, w.user_id, w.is_locked AS workout_locked
    FROM workout_exercises wx
    JOIN workouts w ON w.id = wx.workout_id
    WHERE wx.id=? AND w.user_id=?
  `,
    [itemId, userId]
  )
  return wx || null
}

/* ----------------------------- LISTA ------------------------------ */
r.get('/', auth(), async (req, res) => {
  const { from, to } = req.query

  let sql = `
    SELECT w.*, COALESCE(bp.body_parts, '') AS body_parts_summary
    FROM workouts w
    LEFT JOIN (
      SELECT wx.workout_id,
             GROUP_CONCAT(DISTINCT e.body_part ORDER BY e.body_part SEPARATOR ', ') AS body_parts
      FROM workout_exercises wx
      JOIN exercises e ON e.id = wx.exercise_id
      GROUP BY wx.workout_id
    ) bp ON bp.workout_id = w.id
    WHERE w.user_id = ?`
  const params = [req.user.id]

  if (from) { sql += ' AND w.workout_date >= ?'; params.push(from) }
  if (to)   { sql += ' AND w.workout_date <= ?'; params.push(to) }

  sql += ' ORDER BY w.workout_date DESC, w.id DESC'

  const [rows] = await pool.query(sql, params)
  res.json(rows)
})

/* --------------------------- DETALJ TRENINGA ---------------------- */
r.get('/:id', auth(), async (req, res) => {
  const workoutId = req.params.id
  const w = await getWorkoutForUser(workoutId, req.user.id)
  if (!w) return res.status(404).json({ message: 'Nije pronađeno' })

  const [items] = await pool.query(
    `
    SELECT wx.*, e.name AS exercise_name, e.body_part
    FROM workout_exercises wx
    JOIN exercises e ON e.id = wx.exercise_id
    WHERE wx.workout_id = ?
    ORDER BY wx.order_index ASC, wx.id ASC
  `,
    [workoutId]
  )

  // pridruži setove
  for (const it of items) {
    const [sets] = await pool.query(
      'SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC',
      [it.id]
    )
    it.sets = sets
  }

  res.json({ ...w, items })
})

/* ------------------------------ CREATE ---------------------------- */
r.post('/', auth(), async (req, res) => {
  const { title, workout_date, notes } = req.body
  if (!title || !workout_date) {
    return res.status(400).json({ message: 'Nedostaju polja' })
  }

  // ✅ ne dopusti kreiranje treninga u prošlosti (usporedba po danu)
  // Uspoređujemo ISO datume u formatu YYYY-MM-DD (leksički rade ispravno).
  const todayStr = new Date().toISOString().slice(0, 10) // današnji dan (UTC)
  if (workout_date < todayStr) {
    return res.status(422).json({ message: 'Ne možeš kreirati trening u prošlosti' })
  }

  const [result] = await pool.query(
    'INSERT INTO workouts (user_id, title, workout_date, notes) VALUES (?,?,?,?)',
    [req.user.id, title, workout_date, notes || null]
  )
  res.status(201).json({ id: result.insertId })
})

/* ------------------------------- UPDATE --------------------------- */
r.put('/:id', auth(), async (req, res) => {
  const w = await getWorkoutForUser(req.params.id, req.user.id)
  if (!w) return res.status(404).json({ message: 'Trening ne postoji' })
  if (w.is_locked) return res.status(409).json({ message: 'Trening je zaključan' })

  const { title, workout_date, notes } = req.body
  await pool.query(
    'UPDATE workouts SET title=?, workout_date=?, notes=? WHERE id=? AND user_id=?',
    [title, workout_date, notes || null, req.params.id, req.user.id]
  )
  res.json({ ok: true })
})

/* ------------------------------- DELETE --------------------------- */
r.delete('/:id', auth(), async (req, res) => {
  const w = await getWorkoutForUser(req.params.id, req.user.id)
  if (!w) return res.status(404).json({ message: 'Trening ne postoji' })
  if (w.is_locked) return res.status(409).json({ message: 'Trening je zaključan' })

  await pool.query('DELETE FROM workouts WHERE id=? AND user_id=?', [req.params.id, req.user.id])
  res.json({ ok: true })
})

/* ----------------------- DODAJ / BRIŠI VJEŽBU --------------------- */
r.post('/:id/exercises', auth(), async (req, res) => {
  const { exercise_id, order_index = 0, planned_sets = 0, planned_reps = 0 } = req.body
  const workoutId = req.params.id
  const w = await getWorkoutForUser(workoutId, req.user.id)
  if (!w) return res.status(404).json({ message: 'Trening ne postoji' })
  if (w.is_locked) return res.status(409).json({ message: 'Trening je zaključan' })

  const [result] = await pool.query(
    'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, planned_sets, planned_reps, locked, completed_at) VALUES (?,?,?,?,?,0,NULL)',
    [workoutId, exercise_id, order_index, planned_sets, planned_reps]
  )
  res.status(201).json({ itemId: result.insertId })
})

r.delete('/:id/exercises/:itemId', auth(), async (req, res) => {
  const { id, itemId } = req.params
  const [[row]] = await pool.query(
    `
    SELECT wx.id, wx.locked, w.is_locked
    FROM workout_exercises wx
    JOIN workouts w ON w.id = wx.workout_id
    WHERE wx.id=? AND w.user_id=? AND w.id=?
  `,
    [itemId, req.user.id, id]
  )

  if (!row) return res.status(404).json({ message: 'Stavka ne postoji' })
  if (row.is_locked) return res.status(409).json({ message: 'Trening je zaključan' })
  if (row.locked) return res.status(409).json({ message: 'Vježba je zaključana' })

  await pool.query('DELETE FROM workout_exercises WHERE id=?', [itemId])
  res.json({ ok: true })
})

/* ---------------------------- SETS (CRUD) ------------------------- */
r.post('/exercise-items/:itemId/sets', auth(), async (req, res) => {
  const { itemId } = req.params
  const { set_number, reps, weight = null, rest_seconds = null } = req.body

  const wx = await getItemForUser(itemId, req.user.id)
  if (!wx) return res.status(404).json({ message: 'Stavka ne postoji' })
  if (wx.workout_locked) return res.status(409).json({ message: 'Trening je zaključan' })
  if (wx.locked) return res.status(409).json({ message: 'Vježba je zaključana' })

  const [result] = await pool.query(
    'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rest_seconds) VALUES (?,?,?,?,?)',
    [itemId, set_number, reps, weight, rest_seconds]
  )
  res.status(201).json({ setId: result.insertId })
})

r.put('/sets/:setId', auth(), async (req, res) => {
  const { setId } = req.params
  const { set_number, reps, weight = null, rest_seconds = null } = req.body

  const [[row]] = await pool.query(
    `
    SELECT s.id, wx.locked, w.is_locked AS workout_locked
    FROM workout_sets s
    JOIN workout_exercises wx ON wx.id = s.workout_exercise_id
    JOIN workouts w ON w.id = wx.workout_id
    WHERE s.id=? AND w.user_id=?
  `,
    [setId, req.user.id]
  )

  if (!row) return res.status(404).json({ message: 'Set ne postoji' })
  if (row.workout_locked) return res.status(409).json({ message: 'Trening je zaključan' })
  if (row.locked) return res.status(409).json({ message: 'Vježba je zaključana' })

  await pool.query(
    'UPDATE workout_sets SET set_number=?, reps=?, weight=?, rest_seconds=? WHERE id=?',
    [set_number, reps, weight, rest_seconds, setId]
  )
  res.json({ ok: true })
})

r.delete('/sets/:setId', auth(), async (req, res) => {
  const { setId } = req.params

  const [[row]] = await pool.query(
    `
    SELECT s.id, wx.locked, w.is_locked AS workout_locked
    FROM workout_sets s
    JOIN workout_exercises wx ON wx.id = s.workout_exercise_id
    JOIN workouts w ON w.id = wx.workout_id
    WHERE s.id=? AND w.user_id=?
  `,
    [setId, req.user.id]
  )

  if (!row) return res.status(404).json({ message: 'Set ne postoji' })
  if (row.workout_locked) return res.status(409).json({ message: 'Trening je zaključan' })
  if (row.locked) return res.status(409).json({ message: 'Vježba je zaključana' })

  await pool.query('DELETE FROM workout_sets WHERE id=?', [setId])
  res.json({ ok: true })
})

/* ---------------------- LOCK: exercise & workout ------------------ */
// ✅ Zaključaj pojedinu vježbu u treningu
r.put('/:workoutId/exercises/:itemId/lock', auth(), async (req, res) => {
  const { workoutId, itemId } = req.params

  const [[row]] = await pool.query(
    `
    SELECT wx.id, wx.locked, w.is_locked
    FROM workout_exercises wx
    JOIN workouts w ON w.id = wx.workout_id
    WHERE wx.id=? AND wx.workout_id=? AND w.user_id=?
  `,
    [itemId, workoutId, req.user.id]
  )

  if (!row) return res.status(404).json({ message: 'Stavka ne postoji' })
  if (row.is_locked) return res.status(409).json({ message: 'Trening je zaključan' })
  if (row.locked) return res.status(409).json({ message: 'Vježba je već zaključana' })

  await pool.query(
    'UPDATE workout_exercises SET locked=1, completed_at=NOW() WHERE id=?',
    [itemId]
  )
  res.json({ success: true, message: 'Vježba zaključana' })
})

// ✅ Zaključaj cijeli trening
r.put('/:id/lock', auth(), async (req, res) => {
  const w = await getWorkoutForUser(req.params.id, req.user.id)
  if (!w) return res.status(404).json({ message: 'Trening ne postoji' })
  if (w.is_locked) return res.status(409).json({ message: 'Trening je već zaključan' })

  await pool.query('UPDATE workouts SET is_locked=1 WHERE id=?', [req.params.id])
  res.json({ success: true, message: 'Trening zaključan' })
})

export default r
