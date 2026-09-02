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

function Reading({ label, value }) {
  return (
    <div className="reading-row">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
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

  async function loadCrops() {
    try {
      setCrops(await getCrops());
    } catch (err) {
      alert(`Error: ${err.message}`);
      return;
    }
  }

  async function loadReadings() {
    try {
      setReadings(await getReadings());
      setLastRefresh(new Date());
    } catch (err) {
      alert(`Error: ${err.message}`);
      return;
    }
  }

  useEffect(() => {
    loadCrops();
    loadReadings();
  }, []);

  useEffect(() => {
    function closeOnEscape(e) {
      if (e.key === 'Escape') {
        closeModal();
        setHistoryCrop(null);
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const results = crops.map(crop => {
    const reading = getLatestReading(crop.crop_name, readings);
    return { crop, latest_reading: reading, ...analyseCrop(crop, reading) };
  });

  let farmStatus = calculateFarmStatus(results);

  const availableNames = getAvailableCropNames(readings, crops);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAdd() {
    setSelectedCrop(null);
    setForm(emptyForm);
    setFormError('');
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
    setFormError('');
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

    if (modal === 'add' && !form.crop_name) {
      setFormError('Select a crop name');
      return;
    }

    const data = {
      location: form.location,
      target_min: Number(form.target_min),
      target_max: Number(form.target_max),
      normal_water: Number(form.normal_water),
      notes: form.notes
    };

    setFormError('');

    try {
      if (modal === 'add') {
        await createCrop({ crop_name: form.crop_name, ...data });
      } else {
        await updateCrop(selectedCrop.id, data);
      }
      await loadCrops();
      closeModal();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function removeCrop(crop) {
    try {
      await deleteCrop(crop.id);
      await loadCrops();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }

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

        <div className="summary-actions">
          <button className="btn primary" onClick={openAdd}>+ Add Crop Card</button>
          <button className="btn" onClick={loadReadings}>Refresh Sensor Data</button>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{modal === 'add' ? 'Add Crop Card' : 'Edit Crop Card'}</h2>
                {modal === 'edit' && <p>{selectedCrop.crop_name} (name cannot be changed)</p>}
              </div>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form className="crop-form" onSubmit={saveCrop}>
              {modal === 'add' && (
                <label className="full-width">
                  Crop Name
                  <select name="crop_name" value={form.crop_name} onChange={handleChange} required>
                    <option value="" disabled>Select a crop</option>
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
                      <p><strong>{reading.timestamp}</strong> &middot; {reading.sensor_status}</p>
                      <p>Moisture: {reading.soil_moisture}% &middot; Temp: {reading.temperature}°C &middot; Rainfall: {reading.rainfall} mm</p>
                      <p>Condition: {historyResult.condition} &middot; Action: {historyResult.action}</p>
                      {historyResult.alerts.length > 0 && <p>Alerts: {historyResult.alerts.join(', ')}</p>}
                      {reading.notes && <p><em>{reading.notes}</em></p>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {crops.length > 0 && (
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
                        <Reading label="Soil Moisture" value={`${latest_reading.soil_moisture}%`} />
                        <Reading label="Temperature" value={`${latest_reading.temperature} °C`} />
                        <Reading label="Rainfall" value={`${latest_reading.rainfall} mm`} />
                        <Reading label="Sensor" value={latest_reading.sensor_status} />
                      </>
                    ) : <p>No data</p>}
                  </div>

                  <div>
                    <h3>Corrective Measures</h3>
                    <ul className="measures">
                      {measures.map((measure, i) => <li key={i}>{measure}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn" onClick={() => openEdit(crop)}>Modify</button>
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