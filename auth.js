// auth.js — shared account helper, included on every page.
// Handles: signup/login/logout, remembering the session, and
// saving score history to your account when logged in.

const AUTH_API_BASE = 'https://sat.mrnoobyesyes.workers.dev';
const AUTH_TOKEN_KEY = 'sat-token';
const AUTH_EMAIL_KEY = 'sat-email';

function authGetToken() {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch (e) { return null; }
}
function authGetEmail() {
  try { return localStorage.getItem(AUTH_EMAIL_KEY); } catch (e) { return null; }
}
function authIsLoggedIn() {
  return !!authGetToken();
}
function authSetSession(token, email) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EMAIL_KEY, email);
  } catch (e) {}
}
function authLogout() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EMAIL_KEY);
  } catch (e) {}
}

// POST to the worker; a dropped connection becomes a readable message instead of "Failed to fetch".
async function authPost(path, body) {
  try {
    return await fetch(`${AUTH_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
}

async function authSignup(email, password) {
  const res = await authPost('/api/signup', { email, password });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Sign up failed.');
  authSetSession(data.token, data.email);
  return data;
}

async function authLogin(email, password) {
  const res = await authPost('/api/login', { email, password });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Log in failed.');
  authSetSession(data.token, data.email);
  return data;
}

// Confirms the saved session is still valid (not expired/tampered).
// Clears it silently if not. Returns the email if valid, else null.
async function authVerifySession() {
  const token = authGetToken();
  if (!token) return null;
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Only a rejected token logs you out; a server error (5xx, rate limit) keeps the cached session.
    if (res.status === 401 || res.status === 403) { authLogout(); return null; }
    if (!res.ok) return authGetEmail();
    const data = await res.json();
    return data.email;
  } catch (e) {
    return authGetEmail(); // network hiccup — trust the cached session rather than logging out
  }
}

// Save a finished test/drill result. If logged in, saves to the account
// (synced across devices). If not, falls back to this device's localStorage
// (same as the site has always done for guests).
async function saveScoreHistory(record) {
  const token = authGetToken();
  if (token) {
    try {
      // Give up after 10 s so a hanging server can't hold up the page; the result is then kept on this device.
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 10000) : null;
      const res = await fetch(`${AUTH_API_BASE}/api/save-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(record),
        signal: ctrl ? ctrl.signal : undefined
      }).finally(() => { if (timer) clearTimeout(timer); });
      if (res.ok) return;
      // If the token turned out to be invalid/expired, fall through to local save below.
    } catch (e) { /* network issue — fall through to local save */ }
  }
  try {
    const key = 'sat-history';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    // Logged in but the save failed: keep it here and upload it next time the results page reaches the server.
    if (token) record.pendingSync = authGetEmail() || true; // the account it belongs to
    record.date = new Date().toISOString();
    list.unshift(record);
    if (list.length > 300) list.length = 300;
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) { console.warn('Could not save score history', e); }
}

// Renders a small "Log in" / "you@email.com · Log out" widget into any
// element with id="account-status", if that element exists on the page.
async function authRenderStatus() {
  const el = document.getElementById('account-status');
  if (!el) return;
  const token = authGetToken();
  if (!token) {
    el.innerHTML = `<a href="login.html" style="font-size:13px;color:var(--gray-mid);text-decoration:none;border:1px solid var(--gray-border);border-radius:6px;padding:6px 14px;">Log in</a>`;
    return;
  }
  const cachedEmail = authGetEmail();
  el.innerHTML = `<span style="font-size:13px;color:var(--gray-mid)">${String(cachedEmail || '...').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';')}</span> <a href="#" onclick="authLogout();location.reload();return false;" style="font-size:13px;color:var(--gray-mid);text-decoration:underline;margin-left:8px;">Log out</a>`;
  const email = await authVerifySession();
  if (!email) { el.innerHTML = `<a href="login.html" style="font-size:13px;color:var(--gray-mid);text-decoration:none;border:1px solid var(--gray-border);border-radius:6px;padding:6px 14px;">Log in</a>`; }
}

document.addEventListener('DOMContentLoaded', authRenderStatus);
