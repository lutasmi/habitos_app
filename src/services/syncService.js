/**
 * syncService.js
 *
 * Orquesta la sincronización entre la app y Google Sheets.
 *
 * Reglas:
 * 1. Al abrir: caché → Sheets → si Sheets responde, Sheets gana.
 * 2. Al guardar: enviar a Sheets → si ok, actualizar estado local.
 * 3. Si falla: NO marcar como guardado, mostrar error.
 */

import * as sheetsClient from './sheetsClient.js';
import * as localCache   from './localCache.js';

// ── Carga inicial ─────────────────────────────────────────────────────────────

export async function loadOnOpen(onCacheLoaded, onSheetsLoaded) {
  const cached = localCache.getCachedAllData();
  if (cached && typeof onCacheLoaded === 'function') {
    onCacheLoaded(cached);
  }

  const result = await sheetsClient.readAll();

  if (result.ok && result.data) {
    const replacedLocalData = !!cached;
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

// ── Guardado diario ───────────────────────────────────────────────────────────

export async function saveDailyToSheets(dailyPayload) {
  const result = await sheetsClient.saveDaily(dailyPayload);

  if (result.ok) {
    localCache.clearPendingDaily();
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar en Google Sheets.' };
}

// ── Guardado de actividad ─────────────────────────────────────────────────────

export async function saveActivityToSheets(activityPayload) {
  const result = await sheetsClient.saveActivity(activityPayload);

  if (result.ok) {
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar la actividad.' };
}

// ── Guardado de configuración ─────────────────────────────────────────────────

export async function saveConfigToSheets(configPayload) {
  const result = await sheetsClient.saveConfig(configPayload);

  if (result.ok) {
    return { ok: true, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al guardar la configuración.' };
}

// ── Re-lectura forzada ────────────────────────────────────────────────────────

export async function forceSync() {
  const result = await sheetsClient.readAll();

  if (result.ok && result.data) {
    localCache.cacheAllData(result.data);
    return { ok: true, data: result.data, serverUpdatedAt: result.serverUpdatedAt };
  }

  return { ok: false, error: result.error || 'Error al sincronizar.' };
}

export async function checkConnection() {
  const result = await sheetsClient.ping();
  return { ok: result.ok, error: result.error, serverUpdatedAt: result.serverUpdatedAt };
}

// ── Borrado de registro de actividad ─────────────────────────────────────────

export async function deleteActivityFromSheets(activityLogId) {
  const result = await sheetsClient.deleteActivityLog({ activity_log_id: activityLogId });
  if (result.ok) {
    return { ok: true };
  }
  return { ok: false, error: result.error || 'Error al eliminar el registro.' };
}
