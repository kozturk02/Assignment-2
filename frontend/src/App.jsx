import './App.css';
import { useState, useEffect } from 'react';
import { getCrops, getReadings, createCrop, updateCrop, deleteCrop } from './services/api';
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

  const [editingCropId, setEditingCropId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [historyCropName, setHistoryCropName] = useState(null);

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

  // Escape closes whichever modal is currently open.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      setShowCreateForm(false);
      setEditingCropId(null);
      setEditForm(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  const editingCrop = crops?.find((c) => c.id === editingCropId) ?? null;

  // ---------- Create ----------

  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  function closeCreateModal() {
    setShowCreateForm(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
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
      closeCreateModal();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ---------- Edit ----------

  function handleEditClick(crop) {
    setEditingCropId(crop.id);
    setEditForm({
      location: crop.location,
      target_min: String(crop.target_min),
      target_max: String(crop.target_max),
      normal_water: String(crop.normal_water),
      notes: crop.notes ?? '',
    });
    setEditError(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function closeEditModal() {
    setEditingCropId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function handleEditSubmit(e, cropId) {
    e.preventDefault();
    setEditError(null);

    const payload = {
      location: editForm.location,
      target_min: Number(editForm.target_min),
      target_max: Number(editForm.target_max),
      normal_water: Number(editForm.normal_water),
      notes: editForm.notes,
    };

    setUpdating(true);
    try {
      await updateCrop(cropId, payload);
      await fetchCrops();
      closeEditModal();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ---------- Delete ----------

  async function handleDelete(crop) {
    const confirmed = window.confirm(
      `Delete the ${crop.crop_name} card? This only removes the card -- sensor data is unaffected.`
    );
    if (!confirmed) return;

    setDeletingId(crop.id);
    setDeleteError(null);
    try {
      await deleteCrop(crop.id);
      await fetchCrops();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- Sensor History ----------

  function handleHistoryToggle(crop) {
    setHistoryCropName((prev) => (prev === crop.crop_name ? null : crop.crop_name));
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
    <div className="page">
      <h1 className="page-title">SmartFarm Crop Dashboard</h1>

      <div className="summary-bar">
        <div className="summary-bar__stat">
          <span className="summary-bar__label">Status</span>
          <span className="status-badge" data-status={farmStatus}>{farmStatus}</span>
        </div>
        <div className="summary-bar__stat">
          <span className="summary-bar__label">Crop Cards</span>
          <span className="summary-bar__value">{crops.length}</span>
        </div>
        <div className="summary-bar__stat">
          <span className="summary-bar__label">Last Refresh</span>
          <span className="summary-bar__value">
            {lastRefresh === 'Never' ? 'Never' : lastRefresh.toLocaleTimeString()}
          </span>
        </div>
        <div className="summary-bar__actions">
          <button
            className="btn btn-primary"
            disabled={!sensorFeedAvailable}
            onClick={() => setShowCreateForm(true)}
          >
            + Add Crop Card
          </button>
          <button className="btn" onClick={fetchReadings}>Refresh Sensor Data</button>
        </div>
      </div>

      {readingsError && (
        <p className="error-banner" role="alert">Sensor refresh failed: {readingsError}</p>
      )}
      {deleteError && (
        <p className="error-banner" role="alert">Delete failed: {deleteError}</p>
      )}

      {/* ---------- Add Crop Card modal ---------- */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add Crop Card</h2>
              <button className="modal__close" onClick={closeCreateModal} aria-label="Close">&times;</button>
            </div>

            <form className="crop-form crop-form--modal" onSubmit={handleCreateSubmit}>
              <label>
                Crop Name
                <select name="crop_name" value={createForm.crop_name} onChange={handleCreateChange} required>
                  <option value="" disabled>Select a crop</option>
                  {availableCropNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>

              <label>
                Location
                <input type="text" name="location" placeholder="e.g., Greenhouse 1" value={createForm.location} onChange={handleCreateChange} required />
              </label>

              <label>
                Target Min (%)
                <input type="number" name="target_min" placeholder="e.g., 20" value={createForm.target_min} onChange={handleCreateChange} required />
              </label>

              <label>
                Target Max (%)
                <input type="number" name="target_max" placeholder="e.g., 80" value={createForm.target_max} onChange={handleCreateChange} required />
              </label>

              <label className="full-width">
                Normal Water (L)
                <input type="number" name="normal_water" placeholder="e.g., 500" value={createForm.normal_water} onChange={handleCreateChange} required />
              </label>

              <label className="full-width">
                Notes
                <textarea name="notes" placeholder="Add any notes about this crop..." value={createForm.notes} onChange={handleCreateChange} />
              </label>

              {availableCropNames.length === 0 && (
                <p className="crop-form__error full-width">
                  No crop names available -- every crop in the sensor feed already has a card.
                </p>
              )}
              {createError && <p className="crop-form__error full-width">{createError}</p>}

              <div className="crop-form__actions full-width">
                <button type="button" className="btn" onClick={closeCreateModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Saving...' : 'Save Crop Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Edit Crop Card modal ---------- */}
      {editingCrop && editForm && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2>Edit Crop Card</h2>
                <p className="modal__subtitle">{editingCrop.crop_name} (name cannot be changed)</p>
              </div>
              <button className="modal__close" onClick={closeEditModal} aria-label="Close">&times;</button>
            </div>

            <form className="crop-form crop-form--modal" onSubmit={(e) => handleEditSubmit(e, editingCrop.id)}>
              <label className="full-width">
                Location
                <input type="text" name="location" value={editForm.location} onChange={handleEditChange} required />
              </label>

              <label>
                Target Min (%)
                <input type="number" name="target_min" value={editForm.target_min} onChange={handleEditChange} required />
              </label>

              <label>
                Target Max (%)
                <input type="number" name="target_max" value={editForm.target_max} onChange={handleEditChange} required />
              </label>

              <label className="full-width">
                Normal Water (L)
                <input type="number" name="normal_water" value={editForm.normal_water} onChange={handleEditChange} required />
              </label>

              <label className="full-width">
                Notes
                <textarea name="notes" value={editForm.notes} onChange={handleEditChange} />
              </label>

              {editError && <p className="crop-form__error full-width">{editError}</p>}

              <div className="crop-form__actions full-width">
                <button type="button" className="btn" onClick={closeEditModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {crops.length === 0 ? (
        <p className="empty-state">No crop cards yet. Add one to get started.</p>
      ) : (
        <div className="crop-grid">
          {results.map((result) => {
            const { crop, latest_reading, condition, recommended_water, alerts, action } = result;

            const measures = [`${action}.`];
            if (typeof recommended_water === 'number') {
              measures.push(
                recommended_water > 0
                  ? `Apply ${recommended_water} L of water.`
                  : 'No irrigation needed right now.'
              );
            }
            measures.push(...alerts);

            return (
              <div key={crop.id} className="crop-card">
                <div className="crop-card__header">
                  <div>
                    <h2 className="crop-card__title">{crop.crop_name}</h2>
                    <p className="crop-card__location">{crop.location}</p>
                  </div>
                  <span className="status-badge" data-condition={condition}>{condition}</span>
                </div>

                <div className="crop-card__columns">
                  <div className="crop-card__column">
                    <h3>Information</h3>
                    <p className="info-line">
                      <span className="info-line__label">Target Range:</span>
                      {crop.target_min}&ndash;{crop.target_max}%
                    </p>
                    <p className="info-line">
                      <span className="info-line__label">Normal Water:</span>
                      {crop.normal_water} L
                    </p>
                    {crop.notes && (
                      <p className="info-line">
                        <span className="info-line__label">Notes:</span>
                        {crop.notes}
                      </p>
                    )}
                  </div>

                  <div className="crop-card__column">
                    <h3>Latest Readings</h3>
                    {latest_reading ? (
                      <>
                        <div className="reading-row">
                          <span className="reading-row__label">Latest</span>
                          <span className="reading-row__value">{latest_reading.timestamp}</span>
                        </div>
                        <div className="reading-row">
                          <span className="reading-row__label">Soil Moisture</span>
                          <span className="reading-row__value">{latest_reading.soil_moisture}%</span>
                        </div>
                        <div className="reading-row">
                          <span className="reading-row__label">Temperature</span>
                          <span className="reading-row__value">{latest_reading.temperature} &deg;C</span>
                        </div>
                        <div className="reading-row">
                          <span className="reading-row__label">Rainfall</span>
                          <span className="reading-row__value">{latest_reading.rainfall} mm</span>
                        </div>
                        <div className="reading-row">
                          <span className="reading-row__label">Sensor</span>
                          <span className="reading-row__value">{latest_reading.sensor_status}</span>
                        </div>
                      </>
                    ) : (
                      <p className="info-line">No data</p>
                    )}
                  </div>

                  <div className="crop-card__column">
                    <h3>Corrective Measures</h3>
                    <ul className="measures-list">
                      {measures.map((measure, i) => (
                        <li key={i}>{measure}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="crop-card__actions">
                  <button className="btn" onClick={() => handleEditClick(crop)}>
                    Modify
                  </button>
                  <button className="btn" onClick={() => handleHistoryToggle(crop)}>
                    {historyCropName === crop.crop_name ? 'Hide History' : 'View History'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(crop)}
                    disabled={deletingId === crop.id}
                  >
                    {deletingId === crop.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {historyCropName === crop.crop_name && (
                  <div className="sensor-history">
                    <h3>Sensor History &mdash; {crop.crop_name}</h3>
                    <ul className="sensor-history__list">
                      {readings
                        .filter((r) => r.crop_name === crop.crop_name)
                        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                        .map((reading) => {
                          const historyResult = analyseCrop(crop, reading);
                          return (
                            <li
                              key={reading.timestamp}
                              className="sensor-history__item"
                              data-condition={historyResult.condition}
                            >
                              <p>{reading.timestamp} &middot; {reading.sensor_status}</p>
                              <p>
                                Moisture: {reading.soil_moisture}% &middot; Temp: {reading.temperature}&deg;C &middot; Rainfall: {reading.rainfall}mm
                              </p>
                              <p>
                                Condition: {historyResult.condition} &middot; Action: {historyResult.action}
                              </p>
                              {historyResult.alerts.length > 0 && (
                                <p>Alerts: {historyResult.alerts.join(', ')}</p>
                              )}
                              {reading.notes && <p><em>{reading.notes}</em></p>}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;