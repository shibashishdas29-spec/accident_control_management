/**
 * AEGIS — MongoDB Mongoose Models
 * Stores rich/unstructured incident data, reports, footage metadata
 */

const mongoose = require('mongoose');

/* ─── INCIDENT MODEL ──────────────────────────────────── */
const IncidentSchema = new mongoose.Schema({
  incidentId:         { type: String, required: true, unique: true, index: true },
  description:        { type: String, default: '' },
  preventiveMeasures: [{ type: String }],
  remedialMeasures:   [{ type: String }],
  footageUrls:        [{ type: String }],
  cameraIds:          [{ type: String }],
  aiAnalysis: {
    confidence:       Number,
    detectedObjects:  [String],
    speedEstimates:   [Number],
    anomalyScore:     Number,
  },
  weatherConditions: {
    condition:        String,
    temperature:      Number,
    visibility:       String,
    roadSurface:      String,
  },
  witnesses:          [{ name: String, contact: String, statement: String }],
  officerNotes:       String,
  attachments:        [{ filename: String, url: String, type: String, uploadedAt: Date }],
  createdAt:          { type: Date, default: Date.now },
  updatedAt:          { type: Date, default: Date.now },
});

IncidentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/* ─── REPORT MODEL ────────────────────────────────────── */
const ReportSchema = new mongoose.Schema({
  reportId:       { type: String, required: true, unique: true },
  incidentId:     { type: String, required: true, index: true },
  generatedBy:    String,
  generatedAt:    { type: Date, default: Date.now },
  reportType:     { type: String, enum: ['auto', 'manual', 'ai-generated'], default: 'manual' },
  title:          String,
  summary:        String,
  detailedFindings: String,
  survivalRate:   Number,
  casualties:     Number,
  preventiveMeasures: [{ measure: String, implementedAt: Date, implementedBy: String }],
  remedialMeasures:   [{ measure: String, completedAt: Date, completedBy: String, cost: Number }],
  recommendedActions: [{ action: String, priority: String, deadline: Date }],
  attachedFootage:    [{ cameraId: String, url: String, timestamp: Date, duration: Number }],
  authorityNotified:  [{ authority: String, notifiedAt: Date, respondedAt: Date }],
  status:         { type: String, enum: ['draft','submitted','reviewed','closed'], default: 'draft' },
});

/* ─── CAMERA MODEL ────────────────────────────────────── */
const CameraSchema = new mongoose.Schema({
  cameraId:       { type: String, required: true, unique: true },
  name:           String,
  location:       String,
  latitude:       Number,
  longitude:      Number,
  streamUrl:      String,
  resolution:     String,
  aiEnabled:      { type: Boolean, default: true },
  status:         { type: String, enum: ['active','inactive','maintenance'], default: 'active' },
  lastPing:       Date,
  incidentsDetected: { type: Number, default: 0 },
  installedAt:    Date,
});

/* ─── SPEED VIOLATION MODEL ──────────────────────────── */
const SpeedViolationSchema = new mongoose.Schema({
  violationId:    { type: String, required: true, unique: true },
  plateNumber:    { type: String, required: true, index: true },
  speed:          { type: Number, required: true },
  speedLimit:     { type: Number, required: true },
  location:       String,
  cameraId:       String,
  imageUrl:       String,
  detectedAt:     { type: Date, default: Date.now },
  challanIssued:  { type: Boolean, default: false },
  severity:       { type: String, enum: ['minor','moderate','critical'] },
});

/* ─── AUTHORITY LOG MODEL ────────────────────────────── */
const AuthorityLogSchema = new mongoose.Schema({
  logId:          String,
  incidentId:     String,
  authorityType:  { type: String, enum: ['police','ambulance','fire','highway','medical-team','air-ambulance'] },
  unitId:         String,
  dispatchedAt:   Date,
  arrivedAt:      Date,
  clearedAt:      Date,
  etaMinutes:     Number,
  officer:        String,
  actions:        [String],
  notes:          String,
});

module.exports = {
  Incident:       mongoose.model('Incident', IncidentSchema),
  Report:         mongoose.model('Report', ReportSchema),
  Camera:         mongoose.model('Camera', CameraSchema),
  SpeedViolation: mongoose.model('SpeedViolation', SpeedViolationSchema),
  AuthorityLog:   mongoose.model('AuthorityLog', AuthorityLogSchema),
};
