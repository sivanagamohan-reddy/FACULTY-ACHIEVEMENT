const AUTH_KEY = 'faculty_tracker_auth';

export async function apiGet(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return parseResponse(res);
  } catch (_error) {
    throw new Error('Cannot reach server. Ensure backend is running on http://localhost:4000.');
  }
}

export async function apiPost(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });
    return parseResponse(res);
  } catch (_error) {
    throw new Error('Cannot reach server. Ensure backend is running on http://localhost:4000.');
  }
}

export async function apiPut(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });
    return parseResponse(res);
  } catch (_error) {
    throw new Error('Cannot reach server. Ensure backend is running on http://localhost:4000.');
  }
}

async function parseResponse(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_err) {
    data = { message: normalizeNonJsonError(text) };
  }
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function normalizeNonJsonError(text) {
  const raw = String(text || '').trim();
  if (!raw) return 'Unexpected empty response from server';

  const preMatch = raw.match(/<pre>([\s\S]*?)<\/pre>/i);
  if (preMatch?.[1]) {
    return decodeHtml(preMatch[1]).trim();
  }

  // Fallback: strip all tags from HTML responses
  const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped || 'Unexpected response from server';
}

function decodeHtml(input) {
  return String(input || '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

export function setAuthState(state) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(state || {}));
}

export function getAuthState() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || '{}');
  } catch (_err) {
    return {};
  }
}

export function clearAuthState() {
  sessionStorage.removeItem(AUTH_KEY);
}
