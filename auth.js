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

async function authSignup(email, password) {
  const res = await fetch(`${AUTH_API_BASE}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sign up failed.');
  authSetSession(data.token, data.email);
  return data;
}

async function authLogin(email, password) {
  const res = await fetch(`${AUTH_API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
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
    if (!res.ok) { authLogout(); return null; }
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
      const res = await fetch(`${AUTH_API_BASE}/api/save-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(record)
      });
      if (res.ok) return;
      // If the token turned out to be invalid/expired, fall through to local save below.
    } catch (e) { /* network issue — fall through to local save */ }
  }
  try {
    const key = 'sat-history';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
  el.innerHTML = `<span style="font-size:13px;color:var(--gray-mid)">${cachedEmail || '...'}</span> <a href="#" onclick="authLogout();location.reload();return false;" style="font-size:13px;color:var(--gray-mid);text-decoration:underline;margin-left:8px;">Log out</a>`;
  const email = await authVerifySession();
  if (!email) { el.innerHTML = `<a href="login.html" style="font-size:13px;color:var(--gray-mid);text-decoration:none;border:1px solid var(--gray-border);border-radius:6px;padding:6px 14px;">Log in</a>`; }
}

document.addEventListener('DOMContentLoaded', authRenderStatus);