import './App.css';
import { useState, useEffect } from 'react';
import { getCrops, getReadings, createCrop } from './services/api';
import {
  getAvailableCropNames,
  getLatestReading,
  analyseCrop,
  calculateFarmStatus,
} from './utils/analysis';

const EMPTY_CREATE_FORM = {
  crop_name: '',
  location: '',
  target_min: '',
  target_max: '',
  normal_water: '',
  notes: '',
};

function App() {
  const [crops, setCrops] = useState(null);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);

  const [readings, setReadings] = useState([]);
  const [sensorFeedAvailable, setSensorFeedAvailable] = useState(false);
  const [readingsError, setReadingsError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState('Never');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

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

  const availableCropNames = crops !== null ? getAvailableCropNames(readings, crops) : [];

  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.crop_name) {
      setCreateError('Select a crop name');
      return;
    }

    const payload = {
      crop_name: createForm.crop_name,
      location: createForm.location,
      target_min: Number(createForm.target_min),
      target_max: Number(createForm.target_max),
      normal_water: Number(createForm.normal_water),
      notes: createForm.notes,
    };

    setCreating(true);
    try {
      await createCrop(payload);
      await fetchCrops();
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (cropsLoading) {
    return <p className="loading-state">Loading crop cards...</p>;
  }

  if (cropsError) {
    return (
      <div className="error-state">
        <p>Something went wrong loading crop cards: {cropsError}</p>
        <button className="btn" onClick={fetchCrops}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>SmartFarm Crop Dashboard</h1>

        <div className="app-header__stats">
          <span className="status-badge" data-status={farmStatus}>{farmStatus}</span>
          <span>Crop cards: {crops.length}</span>
          <span>
            Last sensor refresh:{' '}
            {lastRefresh === 'Never' ? 'Never' : lastRefresh.toLocaleTimeString()}
          </span>
        </div>

        <div className="app-header__actions">
          <button
            className="btn btn-primary"
            disabled={!sensorFeedAvailable}
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? 'Close Form' : 'Add Crop Card'}
          </button>
          <button className="btn" onClick={fetchReadings}>Refresh Sensor Data</button>
        </div>
      </header>

      {readingsError && (
        <p className="error-banner" role="alert">Sensor refresh failed: {readingsError}</p>
      )}

      {showCreateForm && (
        <form className="crop-form" onSubmit={handleCreateSubmit}>
          <label>
            Crop
            <select
              name="crop_name"
              value={createForm.crop_name}
              onChange={handleCreateChange}
              required
            >
              <option value="" disabled>Select a crop</option>
              {availableCropNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          {availableCropNames.length === 0 && (
            <p className="crop-form__error">
              No crop names available -- every crop in the sensor feed already has a card.
            </p>
          )}

          <label>
            Location
            <input
              type="text"
              name="location"
              value={createForm.location}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label>
            Target min (%)
            <input
              type="number"
              name="target_min"
              value={createForm.target_min}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label>
            Target max (%)
            <input
              type="number"
              name="target_max"
              value={createForm.target_max}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label>
            Normal water (L)
            <input
              type="number"
              name="normal_water"
              value={createForm.normal_water}
              onChange={handleCreateChange}
              required
            />
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              value={createForm.notes}
              onChange={handleCreateChange}
            />
          </label>

          {createError && <p className="crop-form__error">{createError}</p>}

          <div className="crop-form__actions">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Saving...' : 'Save Crop Card'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(EMPTY_CREATE_FORM);
                setCreateError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {crops.length === 0 ? (
        <p className="empty-state">No crop cards yet. Add one to get started.</p>
      ) : (
        <div className="crop-grid">
          {results.map(({ crop, latest_reading, condition, recommended_water, alerts, action }) => (
            <div key={crop.id} className="crop-card" data-condition={condition}>
              <h2 className="crop-card__title">{crop.crop_name}</h2>
              <p className="crop-card__location">{crop.location}</p>

              {latest_reading ? (
                <>
                  <p>Latest: {latest_reading.timestamp}</p>
                  <p className="crop-card__reading-row">
                    <span>Moisture: {latest_reading.soil_moisture}%</span>
                    <span>Temp: {latest_reading.temperature}&deg;C</span>
                    <span>Rainfall: {latest_reading.rainfall}mm</span>
                  </p>
                </>
              ) : (
                <p>No sensor reading available</p>
              )}

              <p className="crop-card__condition">Condition: {condition}</p>
              <p>
                Recommended water:{' '}
                {recommended_water === 'N/A' ? 'N/A' : `${recommended_water} L`}
              </p>

              {alerts.length > 0 && (
                <ul className="crop-card__alerts">
                  {alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              )}

              <p>Action: {action}</p>
              <p>
                Target: {crop.target_min}&ndash;{crop.target_max}% &middot; Normal water: {crop.normal_water} L
              </p>
              {crop.notes && <p>{crop.notes}</p>}

              <div className="crop-card__actions">
                <button className="btn">Edit</button>
                <button className="btn btn-danger">Delete</button>
                <button className="btn">View Sensor History</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;