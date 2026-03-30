const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

function token() {
  return localStorage.getItem('wc_token');
}
function adminToken() {
  return sessionStorage.getItem('wc_admin_token');
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.userAuth && token()) headers['Authorization'] = `Bearer ${token()}`;
  if (options.adminAuth && adminToken()) headers['Authorization'] = `Bearer ${adminToken()}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }
  if (res.headers.get('content-type')?.includes('text/csv')) return res.blob();
  return res.json();
}

// Users
export const registerUser = (name, email, password) =>
  request('/users/register', { method: 'POST', body: { name, email, password } });

export const loginUser = (email, password) =>
  request('/users/login', { method: 'POST', body: { email, password } });

export const getMe = () =>
  request('/users/me', { userAuth: true });

export const getMyOwnership = () =>
  request('/users/me/ownership', { userAuth: true });

export const getMyBids = () =>
  request('/users/me/bids', { userAuth: true });

// Teams
export const getTeams = () => request('/teams');
export const getTeam  = (id) => request(`/teams/${id}`);

// Stats
export const getStats = () => request('/stats');

// Bids
export const placeBid = (team_id, amount) =>
  request('/bids', { method: 'POST', body: { team_id, amount }, userAuth: true });

// Admin
export const adminLogin = (password) => {
  sessionStorage.setItem('wc_admin_token', password);
  return request('/admin/login', { method: 'POST', adminAuth: true });
};

export const getAuction = () => request('/admin/auction', { adminAuth: true });
export const updateAuction = (data) =>
  request('/admin/auction', { method: 'PUT', body: data, adminAuth: true });
export const startAuction = () =>
  request('/admin/auction/start', { method: 'POST', adminAuth: true });
export const closeAuction = () =>
  request('/admin/auction/close', { method: 'POST', adminAuth: true });

export const getAdminUsers = () => request('/admin/users', { adminAuth: true });
export const recordPayment = (user_id, amount, note) =>
  request('/admin/payments', { method: 'POST', body: { user_id, amount, note }, adminAuth: true });
export const deletePayment = (id) =>
  request(`/admin/payments/${id}`, { method: 'DELETE', adminAuth: true });

export const voidBid = (id) =>
  request(`/admin/bids/${id}`, { method: 'DELETE', adminAuth: true });

export const overrideTeamTimer = (id, extended_end_time) =>
  request(`/admin/teams/${id}/timer`, { method: 'PUT', body: { extended_end_time }, adminAuth: true });

export const setTeamLock = (id, is_locked) =>
  request(`/admin/teams/${id}/lock`, { method: 'PUT', body: { is_locked }, adminAuth: true });

export const getPayoutConfig = () => request('/admin/payout-config', { adminAuth: true });
export const savePayoutConfig = (payouts) =>
  request('/admin/payout-config', { method: 'PUT', body: { payouts }, adminAuth: true });

export const submitResults = (placements) =>
  request('/admin/results', { method: 'POST', body: { placements }, adminAuth: true });
export const getResults = () => request('/admin/results', { adminAuth: true });

export const exportBids = () =>
  request('/admin/export/bids', { adminAuth: true });
export const exportPayouts = () =>
  request('/admin/export/payouts', { adminAuth: true });
