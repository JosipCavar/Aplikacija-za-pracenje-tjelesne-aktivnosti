import { Router } from 'express';
import { pool } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const r = Router();

r.get('/', async (req, res) => {
  const { body_part } = req.query;
  try {
    let sql = 'SELECT * FROM exercises';
    const params = [];
    if (body_part) { sql += ' WHERE body_part = ?'; params.push(body_part); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('❌ Greška kod dohvata vježbi:', e);
    res.status(500).json({ message: 'Greška na serveru' });
  }
});

r.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Nije pronađeno' });
  res.json(rows[0]);
});

r.post('/', auth('ADMIN'), async (req, res) => {
  const { name, body_part, short_desc, how_to, youtube_url } = req.body;
  if (!name || !body_part) return res.status(400).json({ message: 'Nedostaju polja' });
  const [result] = await pool.query('INSERT INTO exercises (name, body_part, short_desc, how_to, youtube_url) VALUES (?,?,?,?,?)', [name, body_part, short_desc || null, how_to || null, youtube_url || null]);
  res.status(201).json({ id: result.insertId });
});

r.put('/:id', auth('ADMIN'), async (req, res) => {
  const { name, body_part, short_desc, how_to, youtube_url } = req.body;
  await pool.query('UPDATE exercises SET name=?, body_part=?, short_desc=?, how_to=?, youtube_url=? WHERE id=?', [name, body_part, short_desc || null, how_to || null, youtube_url || null, req.params.id]);
  res.json({ ok: true });
});

r.delete('/:id', auth('ADMIN'), async (req, res) => {
  await pool.query('DELETE FROM exercises WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

export default r;
