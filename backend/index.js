const express = require('express');
const cors = require('cors');
const db = require('./db');
const { readValidatedReadings } = require('./utils/sensorData');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function validateCropData(data) {
  if (typeof data.crop_name !== 'string' || data.crop_name.trim() === ''
        || typeof data.location !== 'string' || data.location.length < 1 || data.location.length > 100
        || typeof data.target_min !== 'number' || data.target_min < 0 || data.target_min > 100
        || typeof data.target_max !== 'number' || data.target_max < 0 || data.target_max > 100
        || data.target_min >= data.target_max
        || typeof data.normal_water !== 'number' || data.normal_water <= 0 || data.normal_water > 10000
        || (data.notes !== undefined && (typeof data.notes !== 'string' || data.notes.length > 500))) {
    return res.status(400).json({ error: 'Invalid crop data' });
  }
}

// CREATE
app.post('/api/crops', (req, res) => {
  const {
    crop_name,
    location,
    target_min,
    target_max,
    normal_water,
    notes,
  } = req.body;

  const validationError = validateCropData({ crop_name, location, target_min, target_max, normal_water, notes });
  if (validationError) {
    return validationError;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO crops (
        crop_name, location,
        target_min, target_max,
        normal_water, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      crop_name,
      location,
      target_min,
      target_max,
      normal_water,
      notes ?? null,
    );

    const newRecord = db
      .prepare('SELECT * FROM crops WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all
app.get('/api/crops', (req, res) => {
  const records = db.prepare('SELECT * FROM crops').all();
  res.json(records);
});

// READ one
app.get('/api/crops/:id', (req, res) => {
  const record = db
    .prepare('SELECT * FROM crops WHERE id = ?')
    .get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Crop not found' });
  }

  res.json(record);
});

// UPDATE
app.put('/api/crops/:id', (req, res) => {
  const {
    crop_name,
    location,
    target_min,
    target_max,
    normal_water,
    notes,
  } = req.body;

  const validationError = validateCropData({ crop_name, location, target_min, target_max, normal_water, notes });
  if (validationError) {
    return validationError;
  }

  try {
    const stmt = db.prepare(`
      UPDATE crops SET
        crop_name = ?, location = ?,
        target_min = ?, target_max = ?,
        normal_water = ?, notes = ? WHERE id = ?`);

    const result = stmt.run(
      crop_name,
      location,
      target_min,
      target_max,
      normal_water,
      notes ?? null,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    const updated = db
      .prepare('SELECT * FROM crops WHERE id = ?')
      .get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
app.delete('/api/crops/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM crops WHERE id = ?');
  const result = stmt.run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Crop not found' });
  }

  res.status(204).send();
});

app.get('/api/readings', (req, res) => {
  try {
    const readings = readValidatedReadings();
    res.status(200).json(readings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sensor data file is invalid' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});