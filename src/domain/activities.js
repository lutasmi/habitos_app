/**
 * activities.js
 *
 * Lógica de dominio para actividades.
 * Las actividades son distintas de los hábitos:
 * - No son diarias obligatorias.
 * - Se registran por objetivos de periodo (semana, mes, trimestre, año).
 * - Una actividad puede registrarse varias veces el mismo día.
 * - Cada registro en ACTIVITY_LOG es independiente.
 */

import { getTodayDateKey, startOfWeek, startOfMonth } from './dates.js';

// ------------------------------------------------------------
// Filtrado y agrupación
// ------------------------------------------------------------

/**
 * Filtra actividades activas y visibles.
 * @param {object[]} activities
 * @returns {object[]}
 */
export function getActiveActivities(activities) {
  return (activities || []).filter(
    a =>
      (a.active  === 'true' || a.active  === true) &&
      (a.visible === 'true' || a.visible === true)
  );
}

/**
 * Agrupa actividades por group_id, respetando sort_order.
 * Devuelve solo grupos con al menos una actividad activa/visible.
 *
 * @param {object[]} activities - CONFIG_ACTIVITIES
 * @param {object[]} groups     - CONFIG_ACTIVITY_GROUPS
 * @returns {object[]}          Array de grupos con propiedad 'activities'
 */
export function groupActivities(activities, groups) {
  const active = getActiveActivities(activities);

  const activeGroups = (groups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  return activeGroups
    .map(group => ({
      ...group,
      activities: active
        .filter(a => a.group_id === group.group_id)
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    }))
    .filter(g => g.activities.length > 0);
}

// ------------------------------------------------------------
// IDs — generados en cliente para idempotencia
// ------------------------------------------------------------

/**
 * Genera un activity_log_id único para un nuevo registro.
 *
 * CONTRATO: El ID se genera en el cliente ANTES de enviar el payload.
 * El servidor hace upsert por este ID. Si se reintenta el mismo POST
 * (fallo de red), no se crea duplicado.
 *
 * Formato: log_YYYYMMDD_<timestamp_ms>_<rand4>
 * Ejemplo: log_20260528_1748434567890_4821
 *
 * @param {string} date 'YYYY-MM-DD'
 * @returns {string}
 */
export function generateActivityLogId(date) {
  const ts   = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000; // 1000–9999
  return `log_${date.replace(/-/g, '')}_${ts}_${rand}`;
}

// ------------------------------------------------------------
// Progreso por periodo
// ------------------------------------------------------------

/**
 * Calcula el progreso de una actividad en su periodo objetivo.
 *
 * @param {object}   activity       Definición de CONFIG_ACTIVITIES
 * @param {object[]} logs           Registros de ACTIVITY_LOG
 * @param {string}   [referenceDate] Fecha de referencia (por defecto hoy)
 * @returns {{ logged: number, target: number, unit: string, percent: number, count: number }}
 */
export function getActivityProgress(activity, logs, referenceDate) {
  const ref    = referenceDate || getTodayDateKey();
  const target = parseFloat(activity.target_value) || 0;
  const period = activity.target_period;

  let rangeStart;
  switch (period) {
    case 'week':
      rangeStart = startOfWeek(ref);
      break;
    case 'month':
      rangeStart = startOfMonth(ref);
      break;
    case 'quarter': {
      const month        = parseInt(ref.substring(5, 7), 10);
      const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;
      rangeStart = `${ref.substring(0, 4)}-${String(quarterMonth).padStart(2, '0')}-01`;
      break;
    }
    case 'year':
      rangeStart = `${ref.substring(0, 4)}-01-01`;
      break;
    default:
      rangeStart = startOfWeek(ref);
  }

  const periodLogs = (logs || []).filter(
    log =>
      log.activity_id === activity.activity_id &&
      log.date >= rangeStart &&
      log.date <= ref
  );

  // Qué se suma depende de la unidad objetivo
  let logged = 0;
  const unit = (activity.target_unit || '').toLowerCase();
  if (unit === 'km') {
    logged = periodLogs.reduce((s, l) => s + (parseFloat(l.distance_km) || 0), 0);
  } else if (unit === 'min' || unit === 'minutos') {
    logged = periodLogs.reduce((s, l) => s + (parseFloat(l.duration_min) || 0), 0);
  } else {
    // Por defecto: número de sesiones
    logged = periodLogs.length;
  }

  const percent = target > 0 ? Math.min(Math.round((logged / target) * 100), 100) : 0;

  return {
    logged:  Math.round(logged * 10) / 10,
    target,
    unit:    activity.target_unit || 'sesiones',
    percent,
    count:   periodLogs.length,
  };
}

// ------------------------------------------------------------
// Flags de campos requeridos
// ------------------------------------------------------------

/**
 * Devuelve qué campos son requeridos para una actividad.
 * @param {object} activity
 * @returns {{ duration: boolean, distance: boolean, comment: boolean }}
 */
export function getRequiredFields(activity) {
  return {
    duration: activity.requires_duration === 'true' || activity.requires_duration === true,
    distance: activity.requires_distance === 'true' || activity.requires_distance === true,
    comment:  activity.requires_comment  === 'true' || activity.requires_comment  === true,
  };
}
