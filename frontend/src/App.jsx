import './App.css';
import { useEffect, useState } from 'react';
import { getCrops, getReadings, createCrop, updateCrop, deleteCrop } from './services/api';
import { getAvailableCropNames, getLatestReading, analyseCrop, calculateFarmStatus } from './utils/analysis';

const emptyForm = {
  crop_name: '',
  location: '',
  target_min: '',
  target_max: '',
  normal_water: '',
  notes: ''
};

function Reading({ label, value, good }) {
  return (
    <div className="reading-row">
      <span className="muted">{label}</span>
      <span className={good === true ? 'good' : good === false ? 'bad' : ''}>
        {value}
      </span>
    </div>
  );
}

function History({ value, good }) {
  return (
    <span className={good ? 'good' : 'bad'}>
      {value}
    </span>
  );
}

function App() {
  const [crops, setCrops] = useState([]);
  const [readings, setReadings] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [historyCrop, setHistoryCrop] = useState(null);
  const [dashError, setDashError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cropError, setCropError] = useState('');
  const [sensorError, setSensorError] = useState('');
  const [readingsHaveLoaded, setReadingsHaveLoaded] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function loadCrops() {
    try {
      setCrops(await getCrops());
      setCropError('');
    } catch (err) {
      setCropError(err.message);
    }
  }

  async function loadReadings() {
    try {
      setReadings(await getReadings());
      setReadingsHaveLoaded(true);
      setSensorError('');
      setLastRefresh(new Date());
    } catch (err) {
      setSensorError(err.message);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      await Promise.all([loadCrops(), loadReadings()]);
      setLoading(false);
    }
    loadDashboard();
  }, []);

  useEffect(() => {
    function closeOnEscape(e) {
      if (e.key === 'Escape') {
        closeModal();
        setHistoryCrop(null);
        setDashError('');
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const results = crops.map(crop => {
    if (!readingsHaveLoaded) {
      return {
        crop,
        latest_reading: null,
        condition: 'N/A',
        recommended_water: 'N/A',
        alerts: [],
        action: 'N/A'
      };
    }

    const reading = getLatestReading(crop.crop_name, readings);
    return { crop, latest_reading: reading, ...analyseCrop(crop, reading) };
  });

  let farmStatus = calculateFarmStatus(results);

  const availableNames = getAvailableCropNames(readings, crops);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAdd() {
    if (availableNames.length === 0) {
      setDashError('No Crop Names Available.');
      setTimeout(() => setDashError(''), 2500);
      return;
    }
    setSelectedCrop(null);
    setForm(emptyForm);
    setModal('add');
  }

  function openEdit(crop) {
    setSelectedCrop(crop);
    setForm({
      crop_name: crop.crop_name,
      location: crop.location,
      target_min: crop.target_min,
      target_max: crop.target_max,
      normal_water: crop.normal_water,
      notes: crop.notes || ''
    });
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setSelectedCrop(null);
    setForm(emptyForm);
    setFormError('');
  }

  async function saveCrop(e) {
    e.preventDefault();

    const data = {
      location: form.location,
      target_min: Number(form.target_min),
      target_max: Number(form.target_max),
      normal_water: Number(form.normal_water),
      notes: form.notes
    };

    try {
      if (modal === 'add') {
        await createCrop({ crop_name: form.crop_name, ...data });
      } else {
        await updateCrop(selectedCrop.id, data);
      }
      await loadCrops();
      closeModal();
      setFeedback('Crop card saved successfully.');
      setTimeout(() => setFeedback(''), 2500);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeCrop(crop) {
    try {
      await deleteCrop(crop.id);
      await loadCrops();
      setFeedback('Crop card deleted successfully.');
      setTimeout(() => setFeedback(''), 2500);
    } catch (err) {
      setDashError(`Delete failed: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">SmartFarm Crop Dashboard</h1>
        <div className="loading-state">Loading SmartFarm dashboard...</div>
      </div>
    );
  }

  if (cropError) {
    return (
      <div className="page">
        <h1 className="page-title">SmartFarm Crop Dashboard</h1>
        <div className="error-state">
          <p>Crop cards could not be loaded: {cropError}</p>
          <button className="btn" onClick={loadCrops}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">SmartFarm Crop Dashboard</h1>

      <div className="summary-bar">
        <div className="summary-stat">
          <span className="summary-label">Status</span>
          <span className="status-badge" data-status={farmStatus}>{farmStatus}</span>
        </div>

        <div className="summary-stat">
          <span className="summary-label">Crop Cards</span>
          <span className="summary-value">{crops.length}</span>
        </div>

        <div className="summary-stat">
          <span className="summary-label">Last Refresh</span>
          <span className="summary-value">{lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}</span>
        </div>

        {sensorError && (
          <div className="dashboard-message error-message">
            <strong>{readingsHaveLoaded ? "Sensor refresh failed" : "Sensor Feed Unavailable"}</strong>
            <div>{`${sensorError}`}</div>
          </div>
        )}

        <div className="summary-actions">
          <button className="btn primary" onClick={openAdd} disabled={!readingsHaveLoaded}>+ Add Crop Card</button>
          <button className="btn" onClick={loadReadings}>Refresh Sensor Data</button>
        </div>
      </div>

      {feedback && (
        <div className="feedback-card" onClick={e => e.stopPropagation()}>
          <h2 className="feedback__title">{feedback}</h2>
        </div>
      )}

      {dashError && (
        <div className="modal-overlay" onClick={() => setDashError('')}>
          <div className="alert-card" onClick={e => e.stopPropagation()}>
            <div className="alert-card__icon">!</div>
            <h2 className="alert-card__title">{dashError}</h2>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{modal === 'add' ? 'Add Crop Card' : 'Edit Crop Card'}</h2>
                {modal === 'edit' && (
                  <label className="full-width">
                    Crop Name
                    <select name="crop_name" value={form.crop_name} disabled>
                      <option value={form.crop_name}>{form.crop_name}</option>
                    </select>
                    <span className="field-note">
                      Crop name cannot be changed.
                    </span>
                  </label>
                )}
              </div>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form className="crop-form" onSubmit={saveCrop}>
              {modal === 'add' && (
                <label className="full-width">
                  Crop Name
                  <select name="crop_name" value={form.crop_name} onChange={handleChange} required>
                    <option value="" disabled>{`Select a crop...`}</option>
                    {availableNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              )}

              <label className="full-width">
                Location
                <input name="location" placeholder="e.g. Greenhouse 1" value={form.location} onChange={handleChange} required />
              </label>

              <label>
                Target Min (%)
                <input type="number" name="target_min" placeholder="min. 0" value={form.target_min} onChange={handleChange} required />
              </label>

              <label>
                Target Max (%)
                <input type="number" name="target_max" placeholder="max. 100" value={form.target_max} onChange={handleChange} required />
              </label>

              <label className="full-width">
                Normal Water (L)
                <input type="number" name="normal_water" placeholder="e.g. 500" value={form.normal_water} onChange={handleChange} required />
              </label>

              <label className="full-width">
                Notes
                <textarea name="notes" placeholder="Add any notes about this crop..." value={form.notes} onChange={handleChange} />
              </label>

              {formError && <p className="form-error full-width">{formError}</p>}

              <div className="form-actions full-width">
                <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                <button className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyCrop && (
        <div className="modal-overlay history-overlay" onClick={() => setHistoryCrop(null)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{historyCrop.crop_name}</h2>
                <p>{historyCrop.location}</p>
              </div>
              <button className="close-btn" onClick={() => setHistoryCrop(null)}>&times;</button>
            </div>

            <div className="history-info">
              <div>
                <span>Target Range</span>
                <strong>{historyCrop.target_min}&ndash;{historyCrop.target_max}%</strong>
              </div>
              <div>
                <span>Normal Water</span>
                <strong>{historyCrop.normal_water} L</strong>
              </div>
              {historyCrop.notes && (
                <div>
                  <span>Notes</span>
                  <strong>{historyCrop.notes}</strong>
                </div>
              )}
            </div>

            <h3 className="history-title">Sensor History</h3>

            <div className="history-list">
              {readings
                .filter(r => r.crop_name === historyCrop.crop_name)
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .map(reading => {
                  const historyResult = analyseCrop(historyCrop, reading);
                  return (
                    <div className="history-item" key={reading.timestamp}>
                      <p>
                        <strong>{reading.timestamp}</strong> {' · Previously: '}
                        <History value={reading.sensor_status}
                          good={reading.sensor_status === 'Online'} />
                      </p>

                      <p>
                        Moisture:{' '}
                        <History value={`${reading.soil_moisture}%`}
                          good={
                            reading.soil_moisture >= historyCrop.target_min &&
                            reading.soil_moisture <= historyCrop.target_max} />
                        {' · '}
                        Temp:{' '}
                        <History
                          value={`${reading.temperature} °C`}
                          good={reading.temperature <= 35} />
                        {' · '}
                        Rainfall:{' '}
                        <History
                          value={`${reading.rainfall} mm`}
                          good={reading.rainfall < 5} />
                      </p>

                      <p>Condition: {historyResult.condition} {' · '} Action: {historyResult.action}</p>
                      {historyResult.alerts.length > 0 && <p>Alerts: {historyResult.alerts.join(', ')}</p>}
                      {reading.notes && <p><em>{reading.notes}</em></p>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {crops.length === 0 ? (
        <div className="empty-state">No Crop Cards. Add a Crop Card to get started.</div>
      ) : (
        <div className="crop-grid">
          {results.map(result => {
            const { crop, latest_reading, condition, recommended_water, alerts, action } = result;
            const measures = [`${action}.`];

            if (typeof recommended_water === 'number' && recommended_water > 0) {
              measures.push(`Apply ${recommended_water} L of water.`);
            }
            if (alerts.length > 0) {
              measures.push(...alerts);
            }

            return (
              <div className="crop-card" key={crop.id}>
                <div className="card-header">
                  <div>
                    <h2>{crop.crop_name}</h2>
                    <p className="location">{crop.location}</p>
                  </div>
                  <span className="status-badge" data-condition={condition}>{condition}</span>
                </div>

                <div className="card-columns">
                  <div>
                    <h3>Information</h3>
                    <p><span className="muted">Target Range:</span> {crop.target_min}&ndash;{crop.target_max}%</p>
                    <p><span className="muted">Normal Water:</span> {crop.normal_water} L</p>
                    {crop.notes && <p><span className="muted">Notes:</span> {crop.notes}</p>}
                  </div>

                  <div>
                    <h3>Latest Readings</h3>
                    {latest_reading ? (
                      <>
                        <Reading label="Latest" value={latest_reading.timestamp} />
                        <Reading label="Soil Moisture" value={`${latest_reading.soil_moisture}%`} good={latest_reading.soil_moisture >= crop.target_min && latest_reading.soil_moisture <= crop.target_max} />
                        <Reading label="Temperature" value={`${latest_reading.temperature} °C`} good={latest_reading.temperature <= 35} />
                        <Reading label="Rainfall" value={`${latest_reading.rainfall} mm`} good={latest_reading.rainfall < 5} />
                        <Reading label="Sensor" value={latest_reading.sensor_status} good={latest_reading.sensor_status === 'Online'} />
                      </>
                    ) : (
                      <>
                        <Reading label="Latest" value="N/A" />
                        <Reading label="Soil Moisture" value="N/A" />
                        <Reading label="Temperature" value="N/A" />
                        <Reading label="Rainfall" value="N/A" />
                        <Reading label="Sensor" value="N/A" />
                      </>
                    )}
                  </div>

                  <div>
                    <h3>Corrective Measures</h3>
                    <p className="recommended-water">
                      Recommended water: {typeof recommended_water === 'number' ? `${recommended_water} L` : 'N/A'}
                    </p>
                    <ul className="measures">
                      {measures.map((measure, i) => <li key={i}>{measure}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn" onClick={() => openEdit(crop)}>Edit</button>
                  <button className="btn" onClick={() => setHistoryCrop(crop)}>View History</button>
                  <button className="btn danger" onClick={() => removeCrop(crop)}>Delete</button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default App;