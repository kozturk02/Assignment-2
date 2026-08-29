const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = 3001;
const errorMessages = require('./errorMsgConfig');

function validateRecord(data) {
  const errors = [];

  if (!data.customer_name || !data.customer_name.trim()) {
    errors.push(errorMessages.CUSTOMER_NAME_REQUIRED);
  }

  if (!['Single', 'Couple', 'Family'].includes(data.cover_type)) {
    errors.push(errorMessages.COVER_TYPE_INVALID);
  }

  if (typeof data.applicant_1_age !== 'number' || data.applicant_1_age < 18 || data.applicant_1_age > 100) {
    errors.push(errorMessages.APPLICANT_1_AGE_INVALID);
  }

  if (!['Yes', 'No', 'Not sure'].includes(data.applicant_1_hospital_history)) {
    errors.push(errorMessages.APPLICANT_1_HISTORY_INVALID);
  }

  const needsApplicant2 = data.cover_type === 'Couple' || data.cover_type === 'Family';
  if (needsApplicant2) {
    if (typeof data.applicant_2_age !== 'number' || data.applicant_2_age < 18 || data.applicant_2_age > 100) {
      errors.push(errorMessages.APPLICANT_2_AGE_INVALID);
    }
    if (!['Yes', 'No', 'Not sure'].includes(data.applicant_2_hospital_history)) {
      errors.push(errorMessages.APPLICANT_2_HISTORY_INVALID);
    }
  }

  if (!['None', 'Basic', 'Bronze', 'Silver', 'Gold'].includes(data.hospital_cover_level)) {
    errors.push(errorMessages.HOSPITAL_COVER_LEVEL_INVALID);
  }

  if (!['None', 'Basic', 'Standard', 'Premium'].includes(data.extras_cover_level)) {
    errors.push(errorMessages.EXTRAS_COVER_LEVEL_INVALID);
  }

  if (!['Monthly', 'Yearly'].includes(data.payment_frequency)) {
    errors.push(errorMessages.PAYMENT_FREQUENCY_INVALID);
  }

  if (
    data.payment_frequency === 'Yearly' &&
    data.annual_discount_percent != null &&
    (data.annual_discount_percent < 0 || data.annual_discount_percent > 10)
  ) {
    errors.push(errorMessages.ANNUAL_DISCOUNT_INVALID);
  }

  return errors;
}

app.use(cors());
app.use(express.json());

// CREATE
app.post('/records', (req, res) => {
const {
  customer_name,
  cover_type,
  applicant_1_age,
  applicant_1_hospital_history,
  applicant_2_age,
  applicant_2_hospital_history,
  hospital_cover_level,
  extras_cover_level,
  payment_frequency,
  annual_discount_percent,
  notes,
} = req.body;

  const errors = validateRecord(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO records (
        customer_name, cover_type,
        applicant_1_age, applicant_1_hospital_history,
        applicant_2_age, applicant_2_hospital_history,
        hospital_cover_level, extras_cover_level,
        payment_frequency, annual_discount_percent, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      customer_name,
      cover_type,
      applicant_1_age,
      applicant_1_hospital_history,
      applicant_2_age ?? null,
      applicant_2_hospital_history ?? null,
      hospital_cover_level,
      extras_cover_level,
      payment_frequency,
      annual_discount_percent ?? null,
      notes ?? null,
    );

    const newRecord = db
      .prepare('SELECT * FROM records WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all
app.get('/records', (req, res) => {
  const records = db.prepare('SELECT * FROM records').all();
  res.json(records);
});

// READ one
app.get('/records/:id', (req, res) => {
  const record = db
    .prepare('SELECT * FROM records WHERE id = ?')
    .get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: errorMessages.NOT_FOUND });
  }

  res.json(record);
});

// UPDATE
app.put('/records/:id', (req, res) => {
  const {
    customer_name,
    cover_type,
    applicant_1_age,
    applicant_1_hospital_history,
    applicant_2_age,
    applicant_2_hospital_history,
    hospital_cover_level,
    extras_cover_level,
    payment_frequency,
    annual_discount_percent,
    notes,
  } = req.body;

  const errors = validateRecord(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  try {
    const stmt = db.prepare(`
      UPDATE records SET
        customer_name = ?, cover_type = ?,
        applicant_1_age = ?, applicant_1_hospital_history = ?,
        applicant_2_age = ?, applicant_2_hospital_history = ?,
        hospital_cover_level = ?, extras_cover_level = ?,
        payment_frequency = ?, annual_discount_percent = ?, notes = ? WHERE id = ?`);

    const result = stmt.run(
      customer_name,
      cover_type,
      applicant_1_age,
      applicant_1_hospital_history,
      applicant_2_age ?? null,
      applicant_2_hospital_history ?? null,
      hospital_cover_level,
      extras_cover_level,
      payment_frequency,
      annual_discount_percent ?? null,
      notes ?? null,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: errorMessages.NOT_FOUND });
    }

    const updated = db
      .prepare('SELECT * FROM records WHERE id = ?')
      .get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
app.delete('/records/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM records WHERE id = ?');
  const result = stmt.run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: errorMessages.NOT_FOUND });
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});