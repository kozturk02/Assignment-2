import { useEffect, useState } from 'react';
import './App.css';
import QuoteModal from './QuoteModal';

const API_URL = 'http://localhost:3001';
const RECORDS_PER_PAGE = 6;

const initialForm = {
  customer_name: '',
  cover_type: 'Single',
  applicant_1_age: '',
  applicant_1_hospital_history: 'Not sure',
  applicant_2_age: '',
  applicant_2_hospital_history: 'Not sure',
  hospital_cover_level: 'None',
  extras_cover_level: 'None',
  payment_frequency: 'Monthly',
  annual_discount_percent: '',
  notes: '',
};

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp.replace(' ', 'T')).toLocaleDateString('en-AU');
}

function getPageNumbers(current, total) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 2, total - 1, total];
  }

  return [1, '...', current, '...', total];
}

function App() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [quoteModalData, setQuoteModalData] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/records`)
      .then((res) => res.json())
      .then(setRecords)
      .catch((err) => console.error('Failed to fetch records:', err));
  }, []);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function buildPayload() {
    const isSingle = form.cover_type === 'Single';
    const isYearly = form.payment_frequency === 'Yearly';

    return {
      customer_name: form.customer_name,
      cover_type: form.cover_type,
      applicant_1_age: Number(form.applicant_1_age),
      applicant_1_hospital_history: form.applicant_1_hospital_history,
      applicant_2_age: isSingle ? null : Number(form.applicant_2_age),
      applicant_2_hospital_history: isSingle
        ? null
        : form.applicant_2_hospital_history,
      hospital_cover_level: form.hospital_cover_level,
      extras_cover_level: form.extras_cover_level,
      payment_frequency: form.payment_frequency,
      annual_discount_percent:
        isYearly && form.annual_discount_percent !== ''
          ? Number(form.annual_discount_percent)
          : null,
      notes: form.notes || null,
    };
  }

  async function handleSubmit(event) {
    setErrorMessage('');
    event.preventDefault();

    const payload = buildPayload();
    const url = editingId
      ? `${API_URL}/records/${editingId}`
      : `${API_URL}/records`;
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Error: ${err.error}`);
      return;
    }

    const saved = await res.json();

    if (editingId) {
      setRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === editingId ? saved : record
        )
      );
      setEditingId(null);
    } else {
      setRecords((currentRecords) => [...currentRecords, saved]);
    }

    setForm(initialForm);
  }

function handleQuote() {
  setErrorMessage('');

  const applicant1Age = Number(form.applicant_1_age);
  const applicant2Age = Number(form.applicant_2_age);
  const annualDiscount = Number(form.annual_discount_percent);

  if (
    form.applicant_1_age === '' ||
    applicant1Age < 18 ||
    applicant1Age > 100
  ) {
    setErrorMessage('Applicant 1 age must be between 18 and 100.');
    return;
  }

  const needsApplicant2 =
    form.cover_type === 'Couple' || form.cover_type === 'Family';

  if (
    needsApplicant2 &&
    (form.applicant_2_age === '' ||
      applicant2Age < 18 ||
      applicant2Age > 100)
  ) {
    setErrorMessage('Applicant 2 age must be between 18 and 100.');
    return;
  }

  if (
    form.hospital_cover_level === 'None'
  ) {
    setErrorMessage(
      'Please select at least one hospital cover option.'
    );
    return;
  }

  if (
    form.payment_frequency === 'Yearly' &&
    (form.annual_discount_percent === '' ||
    annualDiscount < 0 || annualDiscount > 10)
  ) {
    setErrorMessage('Annual discount must be between 0% and 10%.');
    return;
  }

  setQuoteModalData(form);
}

  function handleEditClick(record) {
    setErrorMessage('');
    setEditingId(record.id);
    setForm({
      customer_name: record.customer_name,
      cover_type: record.cover_type,
      applicant_1_age: record.applicant_1_age,
      applicant_1_hospital_history: record.applicant_1_hospital_history,
      applicant_2_age: record.applicant_2_age ?? '',
      applicant_2_hospital_history:
        record.applicant_2_hospital_history ?? 'Not sure',
      hospital_cover_level: record.hospital_cover_level,
      extras_cover_level: record.extras_cover_level,
      payment_frequency: record.payment_frequency,
      annual_discount_percent: record.annual_discount_percent ?? '',
      notes: record.notes ?? '',
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setErrorMessage('');
  }

  async function handleDelete(id) {
    await fetch(`${API_URL}/records/${id}`, { method: 'DELETE' });
    setRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== id)
    );
  }

  const needsApplicant2 = form.cover_type !== 'Single';
  const isYearly = form.payment_frequency === 'Yearly';
  const normalizedSearch = search.toLowerCase();

  const filteredRecords = records.filter((record) =>
    record.customer_name.toLowerCase().includes(normalizedSearch)
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(
    startIndex,
    startIndex + RECORDS_PER_PAGE
  );

  return (
    <div className="App">
      <header className="page-header">
        <h1>Health Cover Records</h1>
      </header>

      <div className="layout">
        <div className="form-panel">
          <div className="panel-header">
            <h2>Create Quote</h2>
            <p>Enter the details below to generate a health cover quote.</p>
          </div>

          <form onSubmit={handleSubmit} className="quote-form">
            <label className="full-width">
              Customer name
              <input
                type="text"
                placeholder="e.g. John Smith"
                required
                value={form.customer_name}
                onChange={(event) =>
                  updateField('customer_name', event.target.value)
                }
              />
            </label>

            <label>
              Applicant 1 age
              <input
                type="number"
                min="18"
                max="100"
                placeholder="18–100"
                required
                value={form.applicant_1_age}
                onChange={(event) =>
                  updateField('applicant_1_age', event.target.value)
                }
              />
            </label>

            <label>
              Applicant 1 hospital cover history
              <select
                value={form.applicant_1_hospital_history}
                onChange={(event) =>
                  updateField(
                    'applicant_1_hospital_history',
                    event.target.value
                  )
                }
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not sure">Not sure</option>
              </select>
            </label>

            {needsApplicant2 && (
              <>
                <label>
                  Applicant 2 age
                  <input
                    type="number"
                    min="18"
                    max="100"
                    required
                    value={form.applicant_2_age}
                    onChange={(event) =>
                      updateField('applicant_2_age', event.target.value)
                    }
                  />
                </label>

                <label>
                  Applicant 2 hospital cover history
                  <select
                    required
                    value={form.applicant_2_hospital_history}
                    onChange={(event) =>
                      updateField(
                        'applicant_2_hospital_history',
                        event.target.value
                      )
                    }
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                </label>
              </>
            )}

            <label>
              Cover type
              <select
                value={form.cover_type}
                onChange={(event) =>
                  updateField('cover_type', event.target.value)
                }
              >
                <option value="Single">Single</option>
                <option value="Couple">Couple</option>
                <option value="Family">Family</option>
              </select>
            </label>

            <label>
              Hospital cover level
              <select
                value={form.hospital_cover_level}
                onChange={(event) =>
                  updateField('hospital_cover_level', event.target.value)
                }
              >
                <option value="None">None</option>
                <option value="Basic">Basic</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
            </label>

            <label>
              Extras cover level
              <select
                value={form.extras_cover_level}
                onChange={(event) =>
                  updateField('extras_cover_level', event.target.value)
                }
              >
                <option value="None">None</option>
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
            </label>

            <label>
              Payment frequency
              <select
                value={form.payment_frequency}
                onChange={(event) =>
                  updateField('payment_frequency', event.target.value)
                }
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </label>

            {isYearly && (
              <label>
                Annual-payment discount %
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.annual_discount_percent}
                  onChange={(event) =>
                    updateField('annual_discount_percent', event.target.value)
                  }
                />
              </label>
            )}

            <label className="full-width">
              Notes (optional)
              <textarea
                placeholder="Add any additional notes..."
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </label>

            <div className="form-actions full-width">
              {errorMessage && (
                <div className="form-error">
                {errorMessage}
               </div>
              )}
            </div>
            <div className="form-actions full-width">
              <button
                type="button"
                className="btn-view-quote"
                  onClick={handleQuote}
              >
                View Quote
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}

              <button type="submit" className="btn-primary">
                {editingId ? 'Update Quote' : '+ Create Quote'}
              </button>
            </div>
          </form>
        </div>

        <div className="records-panel">
          <div className="records-header">
            <h2>Your Records</h2>
            <span className="quote-count">{records.length} quotes</span>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="records-list">
            {paginatedRecords.map((record) => (
              <div key={record.id} className="record-card">
                <div
                  className="record-row"
                  onClick={() => handleEditClick(record)}
                >
                  <div className="record-summary">
                    <strong>{record.customer_name}</strong>
                    <span className="record-meta">
                      {formatDate(record.created_at)}
                    </span>
                  </div>

                  <button
                    className="btn-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(record.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <p className="no-results">No records match your search.</p>
            )}
          </div>

          {filteredRecords.length > 0 && (
            <div className="pagination">
              <button
                className="btn-page btn-arrow"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                ‹
              </button>

              {getPageNumbers(currentPage, totalPages).map((page, index) =>
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    className={`btn-page ${
                      page === currentPage ? 'btn-page-active' : ''
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                className="btn-page btn-arrow"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {quoteModalData && (
        <QuoteModal
          record={quoteModalData}
          onClose={() => setQuoteModalData(null)}
        />
      )}
    </div>
  );
}

export default App;