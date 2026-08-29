const Database = require('better-sqlite3');

const db = new Database('records.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    cover_type TEXT NOT NULL,
    applicant_1_age INTEGER NOT NULL,
    applicant_1_hospital_history TEXT NOT NULL,
    applicant_2_age INTEGER,
    applicant_2_hospital_history TEXT,
    hospital_cover_level TEXT NOT NULL,
    extras_cover_level TEXT NOT NULL,
    payment_frequency TEXT NOT NULL,
    annual_discount_percent INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;