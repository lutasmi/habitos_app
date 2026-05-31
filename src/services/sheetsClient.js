/**
 * sheetsClient.js
 *
 * Cliente HTTP para el Google Apps Script desplegado como Web App.
 * Solo hace peticiones — sin estado, sin side effects.
 *
 * CORS: POST sin Content-Type header para evitar preflight OPTIONS.
 */

import { defaultConfig } from '../config/defaultConfig.js';

function getBaseUrl() {
  return defaultConfig.appsScriptUrl || '';
}

const DEFAULT_TIMEOUT_MS = defaultConfig.requestTimeoutMs || 15000;

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Timeout: el servidor tardó demasiado.' };
    }
    return { ok: false, error: err.message || 'Error de red.' };
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function ping() {
  return fetchWithTimeout(`${getBaseUrl()}?action=ping`);
}

export async function setupSheets() {
  return fetchWithTimeout(`${getBaseUrl()}?action=setup`);
}

export async function readAll() {
  return fetchWithTimeout(`${getBaseUrl()}?action=read_all`);
}

// ── POST ──────────────────────────────────────────────────────────────────────

async function postAction(action, payload) {
  const url = getBaseUrl();
  if (!url) {
    return { ok: false, error: 'URL del Apps Script no configurada. Revisa VITE_APPS_SCRIPT_URL.' };
  }

  // SIN Content-Type header: evita preflight CORS en Apps Script.
  // El body sigue siendo JSON; doPost lee e.postData.contents y parsea.
  return fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  });
}

export async function saveDaily(payload)    { return postAction('save_daily',    payload); }
export async function saveActivity(payload) { return postAction('save_activity', payload); }
export async function saveConfig(payload)   { return postAction('save_config',   payload); }

export async function deleteActivityLog(payload) { return postAction('delete_activity_log', payload); }
