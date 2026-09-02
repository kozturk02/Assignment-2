const fs = require('fs');
const path = require('path');

const READINGS_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');
const REQUIRED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];

function validReading(reading) {
  if (!reading || typeof reading !== 'object') return false;

  if (!REQUIRED_CROPS.includes(reading.crop_name)) return false;
  if (typeof reading.timestamp !== 'string') return false;
  if (typeof reading.soil_moisture !== 'number') return false;
  if (typeof reading.temperature !== 'number') return false;
  if (typeof reading.rainfall !== 'number') return false;
  if (!VALID_STATUSES.includes(reading.sensor_status)) return false;
  if (typeof reading.notes !== 'string') return false;

  return true;
}

function readValidatedReadings() {
  const raw = fs.readFileSync(READINGS_PATH, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(reading => validReading(reading));
}

module.exports = { readValidatedReadings };