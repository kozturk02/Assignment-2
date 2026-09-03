const fs = require('fs');
const path = require('path');

const READINGS_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');
const REQUIRED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];
const REQUIRED_FIELDS = [
  'crop_name',
  'timestamp',
  'soil_moisture',
  'temperature',
  'rainfall',
  'sensor_status',
  'notes'
];

function validTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timestamp)) return false;

  const date = new Date(`${timestamp}Z`);
  if (Number.isNaN(date.getTime())) return false;

  return date.toISOString().slice(0, 19) === timestamp;
}

function validReading(reading) {
  if (!reading || typeof reading !== 'object' || Array.isArray(reading)) return false;

  const fields = Object.keys(reading);
  if (fields.length !== 7) return false;
  if (!REQUIRED_FIELDS.every(field => fields.includes(field))) return false;

  if (!REQUIRED_CROPS.includes(reading.crop_name)) return false;
  if (!validTimestamp(reading.timestamp)) return false;
  if (typeof reading.soil_moisture !== 'number' || !Number.isFinite(reading.soil_moisture)) return false;
  if (typeof reading.temperature !== 'number' || !Number.isFinite(reading.temperature)) return false;
  if (typeof reading.rainfall !== 'number' || !Number.isFinite(reading.rainfall)) return false;
  if (!VALID_STATUSES.includes(reading.sensor_status)) return false;
  if (typeof reading.notes !== 'string') return false;

  return true;
}

function readValidatedReadings() {
  const raw = fs.readFileSync(READINGS_PATH, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length !== 20) {
    throw new Error('Sensor data file is invalid');
  }

  const cropCounts = {
    Tomato: 0,
    Lettuce: 0,
    Wheat: 0,
    Maize: 0
  };

  const timestamps = {
    Tomato: new Set(),
    Lettuce: new Set(),
    Wheat: new Set(),
    Maize: new Set()
  };

  let outOfRangeValues = 0;

  for (const reading of data) {
    if (!validReading(reading)) {
      throw new Error('Sensor data file is invalid');
    }

    cropCounts[reading.crop_name] += 1;

    if (timestamps[reading.crop_name].has(reading.timestamp)) {
      throw new Error('Sensor data file is invalid');
    }
    timestamps[reading.crop_name].add(reading.timestamp);

    if (reading.soil_moisture < 0 || reading.soil_moisture > 100) outOfRangeValues += 1;
    if (reading.temperature < 0 || reading.temperature > 50) outOfRangeValues += 1;
    if (reading.rainfall < 0 || reading.rainfall > 50) outOfRangeValues += 1;
  }

  if (!REQUIRED_CROPS.every(crop => cropCounts[crop] === 5)) {
    throw new Error('Sensor data file is invalid');
  }

  if (outOfRangeValues !== 1) {
    throw new Error('Sensor data file is invalid');
  }

  return data;
}

module.exports = { readValidatedReadings };