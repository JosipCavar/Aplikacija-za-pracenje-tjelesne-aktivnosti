import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

dotenv.config();

async function main(){
  try {
    const email = 'josip@example.com';
    const username = 'Josip';
    const password = '123456';
    const hash = await bcrypt.hash(password, 10);

    const [u] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    let userId;
    if (u.length) {
      userId = u[0].id;
    } else {
      const [ins] = await pool.query('INSERT INTO users (email, password_hash, username, role) VALUES (?,?,?,?)', [email, hash, username, 'ADMIN']);
      userId = ins.insertId;
    }

    const [ex] = await pool.query('SELECT id, name FROM exercises ORDER BY id ASC');
    if (!ex.length) { console.log('No exercises found. Import schema.sql first.'); process.exit(0); }
    const map = Object.fromEntries(ex.map(e => [e.name, e.id]));

    const today = new Date();
    const d = (offset) => new Date(today.getTime() - offset*86400000).toISOString().slice(0,10);

    const workouts = [
      { title: 'PRSA + BICEPS', workout_date: d(2), notes: 'Fokus na bench' },
      { title: 'NOGE', workout_date: d(5), notes: 'Teški čučanj' },
      { title: 'LEDJA + RAMENA', workout_date: d(8), notes: 'Zgibovi i OHP' },
    ];

    for (const w of workouts) {
      const [insW] = await pool.query('INSERT INTO workouts (user_id, title, workout_date, notes) VALUES (?,?,?,?)', [userId, w.title, w.workout_date, w.notes]);
      const wid = insW.insertId;
      const picks = [ map['Bench press'] || ex[0].id, map['Čučanj'] || ex[1].id, map['Zgibovi'] || ex[2].id ];
      let idx = 0;
      for (const eid of picks) {
        const [insWX] = await pool.query('INSERT INTO workout_exercises (workout_id, exercise_id, order_index, planned_sets, planned_reps) VALUES (?,?,?,?,?)', [wid, eid, idx++, 4, 8]);
        const wxid = insWX.insertId;
        await pool.query('INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight) VALUES (?,?,?,?)', [wxid, 1, 8, 60 + Math.random()*20]);
        await pool.query('INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight) VALUES (?,?,?,?)', [wxid, 2, 8, 65 + Math.random()*20]);
      }
    }

    const benchId = map['Bench press'] || ex[0].id;
    const squatId = map['Čučanj'] || ex[1].id;
    const pullupId = map['Zgibovi'] || ex[2].id;

    const records = [
      { exercise_id: benchId, days: 20, weight: 80 },
      { exercise_id: benchId, days: 10, weight: 85 },
      { exercise_id: benchId, days: 2,  weight: 90 },
      { exercise_id: squatId, days: 18, weight: 90 },
      { exercise_id: squatId, days: 7,  weight: 100 },
      { exercise_id: pullupId, days: 5, weight: 25 },
    ];

    for (const r of records) {
      const date = new Date(Date.now() - r.days*86400000).toISOString().slice(0,10);
      await pool.query('INSERT INTO one_rep_maxes (user_id, exercise_id, record_date, weight, note) VALUES (?,?,?,?,?)', [userId, r.exercise_id, date, r.weight, 'seed']);
    }

    console.log('✅ Seed completed. Demo user:', email, 'password:', password);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
