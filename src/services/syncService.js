/**
 * syncService.js
 *
 * Orquesta la sincronización entre la app y Google Sheets.
 *
 * Reglas que debe respetar SIEMPRE:
 * 1. Al abrir: cargar caché → consultar Sheets → si Sheets responde, Sheets gana.
 * 2. Al guardar: enviar a Sheets → reemplazar estado local por respuesta oficial.
 * 3. Si falla el guardado: NO marcar como guardado, mostrar error.
 * 4. Si Sheets reemplaza datos locales: mostrar aviso informativo (no pedir decisión).
 */

import * as sheetsClient from './sheetsClient.js';
import * as localCache from './localCache.js';

// ----------------------------------------------------------------
// Tipos de resultado
// ----------------------------------------------------------------

/**
 * @typedef {object} SyncResult
 * @property {boolean} ok
 * @property {any} [data]
 * @property {string} [error]
 * @property {boolean} [replacedLocalData] - true si Sheets reemplazó datos locales
 * @property {string} [serverUpdatedAt]
 */

// ----------------------------------------------------------------
// Carga inicial (al abrir la app)
// ----------------------------------------------------------------

/**
 * Carga inicial de la app:
 * 1. Devuelve caché inmediatamente si existe.
 * 2. Consulta Sheets en background.
 * 3. Si Sheets responde, reemplaza caché y notifica al caller.
 *
 * @param {function} onCacheLoaded - Callback con los datos de caché (puede ser null)
 * @param {function} onSheetsLoaded - Callback con { ok, data, replacedLocalData, error }
 */
export async function loadOnOpen(onCacheLoaded, onSheetsLoaded) {
  // Paso 1: caché local
  const cached = localCache.getCachedAllData();
  if (cached && typeof onCacheLoaded === 'function') {
    onCacheLoaded(cached);
  }

  // Paso 2: Sheets en background
  const result = await sheetsClient.readAll();

  if (result.ok && result.data) {
    const replacedLocalData = !!cached; // si había caché, la vamos a reemplazar
    localCache.cacheAllData(result.data);

    if (typeof onSheetsLoaded === 'function') {
      onSheetsLoaded({
        ok: true,
        data: result.data,
        replacedLocalData,
        serverUpdatedAt: result.serverUpdatedAt,
      });
    }
  } else {
    if (typeof onSheetsLoaded === 'function') {
      onSheetsLoaded({
        ok: false,
        error: result.error || 'No se pudo conectar con Google Sheets.',
        replacedLocalData: false,
      });
    }
  }
}

// ----------------------------------------------------------------
// Guardado manual
// ----------------------------------------------------------------

/**
 * Guarda el registro diario en Sheets (acción manual del usuario).
 * Si falla, devuelve error y NO modifica el estado local.
 *
 * @param {object} dailyPayload
 * @returns {Promise<SyncResult>}
 */
export async function saveDailyToSheets(dailyPayload) {
  const result = await sheetsClient.saveDaily(dailyPayload);

  if (result.ok) {
    localCache.clearPendingDaily();
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar en Google Sheets.' };
}

/**
 * Guarda un registro de actividad en Sheets.
 *
 * @param {object} activityPayload
 * @returns {Promise<SyncResult>}
 */
export async function saveActivityToSheets(activityPayload) {
  const result = await sheetsClient.saveActivity(activityPayload);

  if (result.ok) {
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar la actividad.' };
}

/**
 * Guarda configuración en Sheets.
 *
 * @param {object} configPayload
 * @returns {Promise<SyncResult>}
 */
export async function saveConfigToSheets(configPayload) {
  const result = await sheetsClient.saveConfig(configPayload);

  if (result.ok) {
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar la configuración.' };
}

// ----------------------------------------------------------------
// Sincronización completa (re-lectura desde Sheets)
// ----------------------------------------------------------------

/**
 * Fuerza una re-lectura completa desde Sheets y actualiza la caché.
 * @returns {Promise<SyncResult>}
 */
export async function forceSync() {
  const result = await sheetsClient.readAll();

  if (result.ok && result.data) {
    localCache.cacheAllData(result.data);
    return { ok: true, data: result.data, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al sincronizar con Google Sheets.' };
}

/**
 * Verifica la conectividad con el Apps Script.
 * @returns {Promise<SyncResult>}
 */
export async function checkConnection() {
  const result = await sheetsClient.ping();
  return {
    ok: result.ok,
    error: result.error,
    serverUpdatedAt: result.serverUpdatedAt,
  };
}
