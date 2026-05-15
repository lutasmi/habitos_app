/**
 * localCache.js
 *
 * Caché local usando localStorage.
 * IMPORTANTE: La caché es solo para velocidad de arranque.
 * Siempre gana Google Sheets cuando está disponible.
 * Nunca se debe consolidar la caché por encima de Sheets.
 */

const CACHE_KEYS = {
  ALL_DATA: 'habitos_all_data',
  LAST_SYNC: 'habitos_last_sync',
  PENDING_DAILY: 'habitos_pending_daily',
};

// ----------------------------------------------------------------
// Lectura / escritura general
// ----------------------------------------------------------------

/**
 * Guarda todos los datos en caché local.
 * @param {object} data - Resultado de readAll()
 */
export function cacheAllData(data) {
  try {
    localStorage.setItem(CACHE_KEYS.ALL_DATA, JSON.stringify(data));
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.warn('[localCache] No se pudo guardar en caché:', err.message);
  }
}

/**
 * Recupera todos los datos desde caché local.
 * @returns {object|null}
 */
export function getCachedAllData() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.ALL_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[localCache] Error leyendo caché:', err.message);
    return null;
  }
}

/**
 * Devuelve la fecha/hora del último sync exitoso con Sheets.
 * @returns {string|null} ISO date string o null
 */
export function getLastSyncTime() {
  return localStorage.getItem(CACHE_KEYS.LAST_SYNC) || null;
}

/**
 * Borra toda la caché local.
 */
export function clearCache() {
  try {
    Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.warn('[localCache] Error borrando caché:', err.message);
  }
}

// ----------------------------------------------------------------
// Borrador pendiente de guardar
// ----------------------------------------------------------------

/**
 * Guarda un borrador del registro diario pendiente de sincronizar.
 * Esto solo se usa para recuperar cambios no guardados si la app se cierra.
 * @param {object} dailyPayload
 */
export function savePendingDaily(dailyPayload) {
  try {
    localStorage.setItem(CACHE_KEYS.PENDING_DAILY, JSON.stringify(dailyPayload));
  } catch (err) {
    console.warn('[localCache] No se pudo guardar borrador pendiente:', err.message);
  }
}

/**
 * Recupera el borrador pendiente.
 * @returns {object|null}
 */
export function getPendingDaily() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.PENDING_DAILY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Elimina el borrador pendiente (después de guardar con éxito).
 */
export function clearPendingDaily() {
  localStorage.removeItem(CACHE_KEYS.PENDING_DAILY);
}
