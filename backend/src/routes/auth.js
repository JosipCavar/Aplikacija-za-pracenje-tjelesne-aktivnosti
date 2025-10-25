import { Router } from 'express';
import { pool } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema } from '../utils/validators.js';

const r = Router();

r.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { email, username, password } = value;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email već postoji' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, username) VALUES (?,?,?)',
      [email, hash, username]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Greška na serveru' });
  }
});

r.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const { email, password } = value;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Pogrešni podaci' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Pogrešni podaci' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Greška na serveru' });
  }
});

export default r;
