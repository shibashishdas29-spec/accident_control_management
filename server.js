/**
 * AEGIS — Accident Prevention System
 * Node.js / Express API Server
 * Port: 3000
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ────────────────────────────────────────────────────────
   MIDDLEWARE
──────────────────────────────────────────────────────── */
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, '../frontend')));

/* ────────────────────────────────────────────────────────
   POSTGRESQL CONNECTION
──────────────────────────────────────────────────────── */
const pgPool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'aegis_db',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pgPool.on('error', (err) => console.error('PostgreSQL Pool Error:', err));

/* ────────────────────────────────────────────────────────
   MONGODB CONNECTION
──────────────────────────────────────────────────────── */
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aegis_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

/* ────────────────────────────────────────────────────────
   MULTER — FILE UPLOAD
──────────────────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/footage');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.avi', '.mkv', '.mov', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

/* ────────────────────────────────────────────────────────
   ROUTES IMPORT
──────────────────────────────────────────────────────── */
const incidentRoutes   = require('./routes/incidents');
const cameraRoutes     = require('./routes/cameras');
const alertRoutes      = require('./routes/alerts');
const reportRoutes     = require('./routes/reports');
const analyticsRoutes  = require('./routes/analytics');
const authorityRoutes  = require('./routes/authorities');
const speedRoutes      = require('./routes/speed');

app.use('/api/incidents',   incidentRoutes);
app.use('/api/cameras',     cameraRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/reports',     reportRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/authorities', authorityRoutes);
app.use('/api/speed',       speedRoutes);

/* ────────────────────────────────────────────────────────
   HEALTH CHECK
──────────────────────────────────────────────────────── */
app.get('/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { postgres: 'connected', mongodb: mongoState }
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

/* ────────────────────────────────────────────────────────
   FILE UPLOAD ENDPOINT
──────────────────────────────────────────────────────── */
app.post('/api/upload/footage', upload.array('footage', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    size: f.size,
    url: `/uploads/footage/${f.filename}`,
    mimetype: f.mimetype,
  }));
  res.json({ success: true, files });
});

/* ────────────────────────────────────────────────────────
   ERROR HANDLER
──────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`\n🛡 AEGIS API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = { app, pgPool };
