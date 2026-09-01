import './App.css';
import { useState, useEffect } from 'react';
import { getCrops, getReadings } from './services/api';
import { getLatestReading, analyseCrop, calculateFarmStatus } from './utils/analysis';

function App() {
  const [crops, setCrops] = useState(null);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);

  const [readings, setReadings] = useState([]);
  const [sensorFeedAvailable, setSensorFeedAvailable] = useState(false);
  const [readingsError, setReadingsError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState('Never');

  async function fetchCrops() {
    setCropsLoading(true);
    try {
      const data = await getCrops();
      setCrops(data);
      setCropsError(null);
    } catch (err) {
      setCropsError(err.message);
    } finally {
      setCropsLoading(false);
    }
  }

  async function fetchReadings() {
    try {
      const data = await getReadings();
      setReadings(data);
      setSensorFeedAvailable(true);
      setLastRefresh(new Date());
      setReadingsError(null);
    } catch (err) {
      setReadingsError(err.message);
    }
  }

  useEffect(() => {
    fetchCrops();
    fetchReadings();
  }, []);

  const results = (crops ?? []).map((crop) => {
    const reading = getLatestReading(crop.crop_name, readings);
    return { crop, latest_reading: reading, ...analyseCrop(crop, reading) };
  });

  let farmStatus = null;
  if (crops !== null) {
    farmStatus =
      crops.length > 0 && !sensorFeedAvailable
        ? 'Sensor Feed Unavailable'
        : calculateFarmStatus(results);
  }

  async function refreshCropsAfterMutation() {
    await fetchCrops();
  }

  if (cropsLoading) {
    return <p>Loading crop cards...</p>;
  }

  if (cropsError) {
    return (
      <div>
        <p>Something went wrong loading crop cards: {cropsError}</p>
        <button onClick={fetchCrops}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>SmartFarm Crop Dashboard</h1>
        <p>Overall Status: {farmStatus}</p>
        <p>Crop cards: {crops.length}</p>
        <p>Last sensor refresh: {lastRefresh === 'Never' ? 'Never' : lastRefresh.toLocaleTimeString()}</p>

        <button disabled={!sensorFeedAvailable}>Add Crop Card</button>
        <button onClick={fetchReadings}>Refresh Sensor Data</button>

        {readingsError && <p role="alert">Sensor refresh failed: {readingsError}</p>}
      </header>

      {crops.length === 0 ? (
        <p>No crop cards yet. Add one to get started.</p>
      ) : (
        <div>
          {results.map(({ crop, latest_reading, condition, recommended_water, alerts, action }) => (
            <div key={crop.id} className="crop-card">
              <h2>{crop.crop_name}</h2> 
              <p>Location: {crop.location}</p>
              <p>Target Min: {crop.target_min}</p>
              <p>Target Max: {crop.target_max}</p>
              <p>Normal Water: {crop.normal_water}</p>
              <p>Notes: {crop.notes}</p>
              <p>Latest Reading: {latest_reading ? latest_reading.value : 'No data'}</p>
              <p>Condition: {condition}</p>
              <p>Recommended Water: {recommended_water}</p>
              <p>Alerts: {alerts.join(', ')}</p>
              <p>Action: {action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;