/**
 * activities.js
 *
 * Utilidades de dominio para actividades.
 */

import { ACTIVITY_PERIODS } from '../config/defaultConfig.js';
import { todayString, startOfWeek, startOfMonth } from './dates.js';

/**
 * Filtra actividades activas y visibles.
 * @param {object[]} activities
 * @returns {object[]}
 */
export function getActiveActivities(activities) {
  return (activities || []).filter(
    a => (a.active === 'true' || a.active === true) &&
         (a.visible === 'true' || a.visible === true)
  );
}

/**
 * Agrupa actividades por group_id.
 * @param {object[]} activities
 * @param {object[]} groups
 * @returns {object[]} Array de grupos con su lista de actividades
 */
export function groupActivities(activities, groups) {
  const active = getActiveActivities(activities);
  const activeGroups = (groups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  return activeGroups.map(group => ({
    ...group,
    activities: active
      .filter(a => a.group_id === group.group_id)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
  }));
}

/**
 * Calcula el progreso de una actividad en su periodo objetivo.
 *
 * @param {object} activity - Definición de la actividad (CONFIG_ACTIVITIES)
 * @param {object[]} logs - Todos los registros de ACTIVITY_LOG
 * @param {string} referenceDate - Fecha de referencia (por defecto hoy)
 * @returns {{ logged: number, target: number, unit: string, percent: number }}
 */
export function getActivityProgress(activity, logs, referenceDate) {
  const ref = referenceDate || todayString();
  const target = parseFloat(activity.target_value) || 0;
  const period = activity.target_period;

  let rangeStart;
  switch (period) {
    case ACTIVITY_PERIODS.WEEK:
      rangeStart = startOfWeek(ref);
      break;
    case ACTIVITY_PERIODS.MONTH:
      rangeStart = startOfMonth(ref);
      break;
    case ACTIVITY_PERIODS.QUARTER: {
      const month = parseInt(ref.substring(5, 7), 10);
      const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
      rangeStart = `${ref.substring(0, 4)}-${String(quarterStart).padStart(2, '0')}-01`;
      break;
    }
    case ACTIVITY_PERIODS.YEAR:
      rangeStart = `${ref.substring(0, 4)}-01-01`;
      break;
    default:
      rangeStart = startOfWeek(ref);
  }

  const periodLogs = (logs || []).filter(
    log => log.activity_id === activity.activity_id && log.date >= rangeStart && log.date <= ref
  );

  // Suma de sesiones (count) o de la unidad registrada.
  // Si la actividad mide distancia, suma km; si mide duración, suma minutos; si no, cuenta sesiones.
  let logged = 0;
  if (activity.target_unit === 'km') {
    logged = periodLogs.reduce((sum, log) => sum + (parseFloat(log.distance_km) || 0), 0);
  } else if (activity.target_unit === 'min') {
    logged = periodLogs.reduce((sum, log) => sum + (parseFloat(log.duration_min) || 0), 0);
  } else {
    logged = periodLogs.length; // sesiones
  }

  const percent = target > 0 ? Math.min(Math.round((logged / target) * 100), 100) : 0;

  return {
    logged: Math.round(logged * 10) / 10,
    target,
    unit: activity.target_unit || 'sesiones',
    percent,
    periodLogs,
  };
}

/**
 * Genera un ID único para un nuevo registro de actividad.
 *
 * CONTRATO: El ID debe generarse en el CLIENTE antes de enviar el payload.
 * El servidor hace upsert por este ID → si se reintenta el mismo POST,
 * no se crea un duplicado. El ID viaja siempre en el payload.
 *
 * Formato: log_YYYYMMDD_<timestamp_ms>_<random4>
 * Ejemplo: log_20240115_1705312345678_4821
 *
 * @param {string} date 'YYYY-MM-DD'
 * @returns {string}
 */
export function generateActivityLogId(date) {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000; // 4 dígitos, nunca < 1000
  return `log_${date.replace(/-/g, '')}_${ts}_${rand}`;
}
