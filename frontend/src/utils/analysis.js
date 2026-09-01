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