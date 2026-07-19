import express from 'express'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import MongoStore from 'connect-mongo'
import dotenv from 'dotenv'
import './config/passport.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import restaurantRoutes from './routes/restaurantRoutes.js'
import dishRoutes from './routes/dishRoutes.js'
import geocodeRoutes from './routes/geocodeRoutes.js'

dotenv.config()

const app = express()

app.set('trust proxy', 1)

const allowedOrigins = [
  'http://localhost:5173',
  'https://bitewise-app.onrender.com'
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use(express.json())

// In tests, sessions use the default in-memory store instead of Mongo
const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
}

if (process.env.NODE_ENV !== 'test') {
  sessionOptions.store = MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}

app.use(session(sessionOptions))

app.use(passport.initialize())
app.use(passport.session())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/restaurants', restaurantRoutes)
app.use('/api/dishes', dishRoutes)
app.use('/api/geocode', geocodeRoutes)

app.get('/', (req, res) => {
  res.send('Bitewise API is running')
})

export default app