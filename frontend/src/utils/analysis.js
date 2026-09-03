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

export function analyseCrop(crop, reading) {
  if (!reading) {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['No data'],
      action: 'Check sensor'
    };
  }

  if (reading.sensor_status !== 'Online') {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['Check sensor'],
      action: 'Check sensor'
    };
  }

  if (reading.soil_moisture < 0 || reading.soil_moisture > 100) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: ['Invalid soil_moisture'],
      action: 'Check reading'
    };
  }

  if (reading.temperature < 0 || reading.temperature > 50) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: ['Invalid temperature'],
      action: 'Check reading'
    };
  }

  if (reading.rainfall < 0 || reading.rainfall > 50) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: ['Invalid rainfall'],
      action: 'Check reading'
    };
  }

  let condition = 'Healthy';
  let water = 0;
  let action = 'Monitor';

  if (reading.soil_moisture < crop.target_min) {
    condition = 'Dry';
    water = crop.normal_water;
    action = 'Water crop';
  }

  if (reading.soil_moisture > crop.target_max) {
    condition = 'Too Wet';
    action = 'Stop watering';
  }

  const alerts = [];

  if (reading.temperature > 35) {
    alerts.push('High temperature');
  }

  if (reading.rainfall >= 5) {
    alerts.push('Rain detected');
  }

  return {
    condition,
    recommended_water: water,
    alerts,
    action
  };
}

export function calculateFarmStatus(results) {
  if (results.length === 0) return 'No Crops';

  if (results.some((r) => r.condition === 'N/A')) {
    return 'Sensor Feed Unavailable';
  }

  if (results.some(
      (r) => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data'
    )
  ) {
    return 'Critical';
  }

  if (results.some(
      (r) =>
        r.condition === 'Dry' || r.condition === 'Too Wet' || r.alerts.includes('High temperature')
    )
  ) { return 'Watch'; }
  return 'Normal';
}