const BASE_URL = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export function getCrops() {
  return request('/crops');
}

export function getCrop(id) {
  return request(`/crops/${id}`);
}

export function createCrop(payload) {
  return request('/crops', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCrop(id, payload) {
  return request(`/crops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteCrop(id) {
  return request(`/crops/${id}`, {
    method: 'DELETE',
  });
}

export function getReadings() {
  return request('/readings');
}