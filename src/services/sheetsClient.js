/**
 * sheetsClient.js
 *
 * Cliente HTTP para comunicarse con el Google Apps Script desplegado como Web App.
 *
 * Todas las funciones devuelven la estructura:
 * { ok: boolean, data?: any, error?: string, serverUpdatedAt?: string }
 *
 * Este cliente NO gestiona el estado de la app. Solo hace peticiones.
 */

import { defaultConfig } from '../config/defaultConfig.js';

// ----------------------------------------------------------------
// Configuración base
// ----------------------------------------------------------------

function getBaseUrl() {
  const url = defaultConfig.appsScriptUrl;
  if (!url) {
    console.warn('[sheetsClient] VITE_APPS_SCRIPT_URL no está configurada.');
  }
  return url;
}

const DEFAULT_TIMEOUT_MS = defaultConfig.requestTimeoutMs || 15000;

// ----------------------------------------------------------------
// Petición base con timeout
// ----------------------------------------------------------------

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);

    const json = await res.json();
    return json;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Timeout: el servidor tardó demasiado en responder.' };
    }
    return { ok: false, error: err.message || 'Error de red desconocido.' };
  }
}

// ----------------------------------------------------------------
// GET requests
// ----------------------------------------------------------------

/**
 * Verifica que el Apps Script responde.
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function ping() {
  const url = `${getBaseUrl()}?action=ping`;
  return fetchWithTimeout(url);
}

/**
 * Crea las hojas de Google Sheets si no existen.
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function setupSheets() {
  const url = `${getBaseUrl()}?action=setup`;
  return fetchWithTimeout(url);
}

/**
 * Lee todos los datos: config + registros diarios + hábitos + actividades.
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function readAll() {
  const url = `${getBaseUrl()}?action=read_all`;
  return fetchWithTimeout(url);
}

// ----------------------------------------------------------------
// POST requests
// ----------------------------------------------------------------

async function postAction(action, payload) {
  const url = getBaseUrl();
  if (!url) {
    return { ok: false, error: 'URL del Apps Script no configurada. Revisa VITE_APPS_SCRIPT_URL.' };
  }

  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
}

/**
 * Guarda el registro diario completo (registro del día + valores de hábitos).
 *
 * @param {object} payload - { date, day_type_id, note, habitValues[], score_day, score_week, score_month }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function saveDaily(payload) {
  return postAction('save_daily', payload);
}

/**
 * Guarda un registro de actividad.
 *
 * @param {object} payload - { date, activity_id, duration_min, distance_km, comment }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function saveActivity(payload) {
  return postAction('save_activity', payload);
}

/**
 * Guarda configuración en una hoja específica.
 *
 * @param {object} payload - { sheetName, records[], primaryKey }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function saveConfig(payload) {
  return postAction('save_config', payload);
}
