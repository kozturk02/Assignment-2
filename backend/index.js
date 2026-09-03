const express = require('express');
const cors = require('cors');
const db = require('./db');
const { readValidatedReadings } = require('./utils/sensorData');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function validateCropAdd(data) {
  if (typeof data.crop_name !== 'string' || data.crop_name.trim() === '') {
    const reason = validateCropUpdate(data);
    if(reason !== '') {
      return 'Please select a crop name.';
    }
    return reason;
  }
  return '';
}

function validateCropUpdate(data) {
  if (typeof data.location !== 'string' || data.location.length < 1) {
    return 'Please enter a valid location name.';
  } 
  if (data.location.length > 100) {
    return 'Location name must be less than 100 characters.';
  }
  if (typeof data.target_min !== 'number' || data.target_min < 0) {
    return 'Minimum target value must be a positive number.';
  }
  if (data.target_min > 100) {
    return 'Minimum target value must be less than 100.';
  }
  if (typeof data.target_max !== 'number' || data.target_max < 0) {
    return 'Maximum target value must be a positive number.';
  }
  if (data.target_max > 100) {
    return 'Maximum target value must be less than 100.';
  }
  if (data.target_min >= data.target_max) {
    return 'Minimum target value must be less than maximum target value.';
  }
  if (typeof data.normal_water !== 'number' || data.normal_water <= 0) {
    return 'Please enter a valid normal water value.';
  } else if (data.normal_water > 10000) {
    return 'Normal water value must be less than 10000L.';
  }
  if (data.notes !== undefined && (typeof data.notes !== 'string' || data.notes.length > 500)) {
    if (typeof data.notes !== 'string') {
      return 'Notes written are not in a valid format.';
    } else if (data.notes.length > 500) {
      return 'Notes can not exceed 500 characters.';
    }
  }
  return '';
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

  const validationError = validateCropAdd({ crop_name, location, target_min, target_max, normal_water, notes });
  if (validationError) {
    return res.status(400).json({ error: validationError });
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
    location,
    target_min,
    target_max,
    normal_water,
    notes,
  } = req.body;

  const validationError = validateCropUpdate({ location, target_min, target_max, normal_water, notes });
  if (validationError !== '') {
    return res.status(400).json({ error: validationError });
  }

  try {
    const stmt = db.prepare(`
      UPDATE crops SET
        location = ?,
        target_min = ?, target_max = ?,
        normal_water = ?, notes = ? WHERE id = ?`);

    const result = stmt.run(
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