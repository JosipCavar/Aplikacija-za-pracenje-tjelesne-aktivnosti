import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import exerciseRoutes from './routes/exercises.js'
import workoutRoutes from './routes/workouts.js'
import recordRoutes from './routes/records.js'
import userRoutes from './routes/users.js' // <— profil rute

dotenv.config()

const app = express()

// ✅ Helmet, ali dopusti cross-origin za resurse (slike)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // <—
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
)

// ✅ CORS – dopusti dev frontend
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
)

app.use(express.json())

// ✅ statički /uploads s CORP headerom, za svaki slučaj
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '..', '..', 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    },
  })
)

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }))

// API rute
app.use('/api/auth', authRoutes)
app.use('/api/exercises', exerciseRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/records', recordRoutes)
app.use('/api/users', userRoutes) // <— profil

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API sluša na http://localhost:${PORT}`))
