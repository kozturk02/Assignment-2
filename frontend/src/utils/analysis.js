function getAvailableCropNames(readings, crops) {
  const existingCropNames = new Set(crops.map((crop) => crop.crop_name));
  const availableCropNames = readings
    .map((reading) => reading.crop_name)
    .filter((name) => !existingCropNames.has(name));
  return Array.from(new Set(availableCropNames));
}

function getLatestReading(cropName, readings) {
  const matches = readings.filter((r) => r.crop_name === cropName);
  if (matches.length === 0) return null;
  return matches.reduce((latest, current) =>
    current.timestamp.localeCompare(latest.timestamp) > 0 ? current : latest
  );
}

export function analyseCrop(cropCard, reading) {
  if (!reading) {
    return { condition: 'Sensor Problem', recommended_water: 'N/A', alerts: ['No data'], action: 'Check sensor' };
  }

  return {
    condition,
    recommended_water,
    alerts,
    action
  };
}

export function calculateFarmStatus(results) {
  if (results.length === 0) return 'No Crops';

  const hasCritical = results.some(
    (r) => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data'
  );
  if (hasCritical) return 'Critical';

  const hasWatch = results.some(
    (r) =>
      r.condition === 'Dry' ||
      r.condition === 'Too Wet' ||
      r.alerts.includes('High temperature')
  );
  if (hasWatch) return 'Watch';

  return 'Normal';
}