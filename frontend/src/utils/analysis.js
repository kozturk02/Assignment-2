export function getAvailableCropNames(readings, crops) {
  const existingCropNames = new Set(crops.map((crop) => crop.crop_name));
  const availableCropNames = readings
    .map((reading) => reading.crop_name)
    .filter((name) => !existingCropNames.has(name));
  return Array.from(new Set(availableCropNames));
}

export function getLatestReading(cropName, readings) {
  const matches = readings.filter((r) => r.crop_name === cropName);
  if (matches.length === 0) return null;
  return matches.reduce((latest, current) =>
    current.timestamp.localeCompare(latest.timestamp) > 0 ? current : latest
  );
}

export function analyseCrop(cropCard, reading) {
  if (!reading) {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['No data'],
      action: 'Check sensor',
    };
  }

  const { soil_moisture, temperature, rainfall, sensor_status } = reading;
  const { target_min, target_max, normal_water } = cropCard;

  if (sensor_status === 'Offline' || sensor_status === 'Faulty') {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['Check sensor'],
      action: 'Check sensor',
    };
  }

  const invalidFields = [];
  if (soil_moisture < 0 || soil_moisture > 100) invalidFields.push('soil_moisture');
  if (temperature < 0 || temperature > 50) invalidFields.push('temperature');
  if (rainfall < 0 || rainfall > 50) invalidFields.push('rainfall');

  if (invalidFields.length > 0) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: invalidFields,
      action: 'Check reading',
    };
  }

  let condition;
  let recommended_water;
  let action;

  if (soil_moisture < target_min) {
    condition = 'Dry';
    recommended_water = normal_water;
    action = 'Water crop';
  } else if (soil_moisture > target_max) {
    condition = 'Too Wet';
    recommended_water = 0;
    action = 'Stop watering';
  } else {
    condition = 'Healthy';
    recommended_water = 0;
    action = 'Monitor';
  }

  const alerts = [];
  if (temperature > 35) alerts.push('High temperature');
  if (rainfall >= 5) alerts.push('Rain detected');

  return { condition, recommended_water, alerts, action };
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