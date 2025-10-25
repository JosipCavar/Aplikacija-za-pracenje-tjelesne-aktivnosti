import { Router } from 'express'
import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'

const r = Router()

/**
 * GET /records
 * Optional: ?exerciseId=123
 * Vraća 1RM zapise SORTIRANE po datumu (ASC) za trenutno prijavljenog korisnika.
 */
r.get('/', auth(), async (req, res) => {
  try {
    const { exerciseId } = req.query
    const params = [req.user.id]
    let where = 'WHERE r.user_id = ?'

    if (exerciseId) {
      where += ' AND r.exercise_id = ?'
      params.push(exerciseId)
    }

    const [rows] = await pool.query(
      `
      SELECT r.id, r.exercise_id, r.weight, r.record_date, r.note,
             e.name AS exercise_name, e.body_part
      FROM one_rep_maxes r
      JOIN exercises e ON e.id = r.exercise_id
      ${where}
      ORDER BY r.record_date ASC, r.id ASC
      `,
      params
    )

    res.json(rows)
  } catch (err) {
    console.error('GET /records error:', err)
    res.status(500).json({ message: 'Greška na serveru' })
  }
})

/**
 * POST /records
 * body: { exercise_id, weight, record_date (YYYY-MM-DD), note? }
 * Dozvoljavamo prošle datume — validiramo samo obavezna polja.
 * Vraćamo 409 ako UNIQUE indeks prijavi duplikat.
 */
r.post('/', auth(), async (req, res) => {
  try {
    const { exercise_id, weight, record_date, note } = req.body
    if (!exercise_id || !weight || !record_date) {
      return res.status(400).json({ message: 'Nedostaju polja' })
    }

    await pool.query(
      `INSERT INTO one_rep_maxes (user_id, exercise_id, weight, record_date, note)
       VALUES (?,?,?,?,?)`,
      [req.user.id, exercise_id, weight, record_date, note || null]
    )

    res.status(201).json({ ok: true })
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Već postoji isti 1RM za tu vježbu s istim datumom i težinom.'
      })
    }
    console.error('POST /records error:', err)
    res.status(500).json({ message: 'Greška na serveru' })
  }
})

/**
 * DELETE /records/:id
 */
r.delete('/:id', auth(), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM one_rep_maxes WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /records/:id error:', err)
    res.status(500).json({ message: 'Greška na serveru' })
  }
})

export default r
