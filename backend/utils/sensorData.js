const fs = require('fs');
const path = require('path');

const READINGS_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');
const REQUIRED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const READINGS_PER_CROP = 5;
const REQUIRED_FIELDS = ['crop_name', 'timestamp', 'soil_moisture', 'temperature', 'rainfall', 'sensor_status', 'notes'];
const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

function isValidTimestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_RE.test(value)) return false;

  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute, second);

  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day &&
    d.getHours() === hour &&
    d.getMinutes() === minute &&
    d.getSeconds() === second
  );
}

function validateStructure(data) {
  if (!Array.isArray(data)) {
    throw new Error('Sensor data is not an array');
  }

  const expectedTotal = REQUIRED_CROPS.length * READINGS_PER_CROP;
  if (data.length !== expectedTotal) {
    throw new Error(`Expected ${expectedTotal} readings, found ${data.length}`);
  }

  const timestampsByCrop = {};

  for (const reading of data) {
    if (typeof reading !== 'object' || reading === null || Array.isArray(reading)) {
      throw new Error('Reading is not an object');
    }

    const keys = Object.keys(reading);
    const hasExactFields =
      keys.length === REQUIRED_FIELDS.length &&
      REQUIRED_FIELDS.every((field) => keys.includes(field));
    if (!hasExactFields) {
      throw new Error(`Reading does not have exactly the required fields: ${keys.join(', ')}`);
    }

    if (!REQUIRED_CROPS.includes(reading.crop_name)) {
      throw new Error(`Invalid crop_name: ${reading.crop_name}`);
    }
    if (typeof reading.soil_moisture !== 'number') {
      throw new Error('soil_moisture must be a number');
    }
    if (typeof reading.temperature !== 'number') {
      throw new Error('temperature must be a number');
    }
    if (typeof reading.rainfall !== 'number') {
      throw new Error('rainfall must be a number');
    }
    if (typeof reading.notes !== 'string') {
      throw new Error('notes must be a string');
    }
    if (!VALID_STATUSES.includes(reading.sensor_status)) {
      throw new Error(`Invalid sensor_status: ${reading.sensor_status}`);
    }
    if (!isValidTimestamp(reading.timestamp)) {
      throw new Error(`Invalid timestamp: ${reading.timestamp}`);
    }

    if (!timestampsByCrop[reading.crop_name]) {
      timestampsByCrop[reading.crop_name] = new Set();
    }
    if (timestampsByCrop[reading.crop_name].has(reading.timestamp)) {
      throw new Error(`Duplicate timestamp for ${reading.crop_name}: ${reading.timestamp}`);
    }
    timestampsByCrop[reading.crop_name].add(reading.timestamp);
  }

  for (const crop of REQUIRED_CROPS) {
    const count = data.filter((r) => r.crop_name === crop).length;
    if (count !== READINGS_PER_CROP) {
      throw new Error(`Expected ${READINGS_PER_CROP} readings for ${crop}, found ${count}`);
    }
  }

  return data;
}

function readValidatedReadings() {
  const raw = fs.readFileSync(READINGS_PATH, 'utf-8');
  const data = JSON.parse(raw);
  return validateStructure(data);
}

module.exports = { readValidatedReadings };