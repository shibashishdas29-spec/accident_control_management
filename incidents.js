/**
 * AEGIS — Incidents API Route
 * GET/POST/PATCH /api/incidents
 */

const express = require('express');
const router = express.Router();
const { pgPool } = require('../server');
const Incident = require('../models/Incident');

// GET all incidents (PostgreSQL — structured data)
router.get('/', async (req, res) => {
  try {
    const { severity, status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];
    if (severity) { params.push(severity); query += ` AND severity = $${params.length}`; }
    if (status)   { params.push(status);   query += ` AND status = $${params.length}`; }
    query += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const result = await pgPool.query(query, params);
    res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single incident
router.get('/:id', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM incidents WHERE incident_id = $1', [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Incident not found' });
    // Also fetch rich data from MongoDB
    const richData = await Incident.findOne({ incidentId: req.params.id });
    res.json({ ...result.rows[0], details: richData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — create new incident
router.post('/', async (req, res) => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const {
      incidentId, severity, location, latitude, longitude,
      vehiclesInvolved, casualties, type, cameraIds,
      description, preventiveMeasures, remedialMeasures, footageUrls
    } = req.body;

    const id = incidentId || `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // Insert into PostgreSQL
    const pgResult = await client.query(
      `INSERT INTO incidents
       (incident_id, severity, location, latitude, longitude, vehicles_involved,
        casualties, type, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',NOW()) RETURNING *`,
      [id, severity, location, latitude, longitude, vehiclesInvolved, casualties, type]
    );

    // Insert rich data into MongoDB
    const mongoDoc = new Incident({
      incidentId: id,
      description, preventiveMeasures, remedialMeasures,
      footageUrls, cameraIds,
      createdAt: new Date(),
    });
    await mongoDoc.save();

    await client.query('COMMIT');
    res.status(201).json({ success: true, incident: pgResult.rows[0], details: mongoDoc });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH — update status/resolve
router.patch('/:id', async (req, res) => {
  try {
    const { status, resolvedAt, notes } = req.body;
    const result = await pgPool.query(
      `UPDATE incidents SET status=$1, resolved_at=$2, updated_at=NOW()
       WHERE incident_id=$3 RETURNING *`,
      [status, resolvedAt || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, incident: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await pgPool.query('DELETE FROM incidents WHERE incident_id=$1', [req.params.id]);
    await Incident.deleteOne({ incidentId: req.params.id });
    res.json({ success: true, message: 'Incident deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
