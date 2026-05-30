/**
 * dates.js
 *
 * Utilidades de fechas para la app.
 * Todas las fechas se manejan como strings 'YYYY-MM-DD' internamente.
 * Se evitan objetos Date para minimizar errores de zona horaria.
 */

/**
 * Devuelve la fecha de hoy como string 'YYYY-MM-DD' en hora local.
 * @returns {string}
 */
export function todayString() {
  const d = new Date();
  return formatDate(d);
}

/**
 * Alias explícito de todayString().
 * Usado en comparaciones de "es hoy" para dejar clara la intención.
 * @returns {string} 'YYYY-MM-DD'
 */
export function getTodayDateKey() {
  return todayString();
}

/**
 * Normaliza cualquier valor de fecha a string 'YYYY-MM-DD'.
 * Maneja strings ISO, strings con timestamp y objetos Date.
 * Nunca compara objetos Date directamente.
 * @param {string|Date} value
 * @returns {string} 'YYYY-MM-DD'
 */
export function normalizeDateKey(value) {
  if (!value) return '';

  if (value instanceof Date) {
    return formatDate(value);
  }

  const str = String(value).trim();

  // Ya es YYYY-MM-DD o YYYY-MM-DDTHH:...
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Último recurso: parsear como Date
  const parsed = new Date(str);
  if (!isNaN(parsed)) return formatDate(parsed);

  return str.slice(0, 10);
}

/**
 * Formatea un objeto Date como 'YYYY-MM-DD' en hora local.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parsea un string 'YYYY-MM-DD' a objeto Date (mediodía local para evitar
 * problemas de zona horaria al cruzar medianoche).
 * @param {string} dateString
 * @returns {Date}
 */
export function parseDate(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Suma N días a un string de fecha.
 * @param {string} dateString
 * @param {number} days
 * @returns {string}
 */
export function addDays(dateString, days) {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Devuelve el lunes de la semana que contiene la fecha dada.
 * @param {string} dateString
 * @returns {string}
 */
export function startOfWeek(dateString) {
  const d = parseDate(dateString);
  const day = d.getDay(); // 0=Dom, 1=Lun...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

/**
 * Devuelve el primer día del mes de la fecha dada.
 * @param {string} dateString
 * @returns {string}
 */
export function startOfMonth(dateString) {
  return dateString.substring(0, 7) + '-01';
}

/**
 * Devuelve array de strings de fechas entre start y end (inclusive).
 * @param {string} startDate
 * @param {string} endDate
 * @returns {string[]}
 */
export function dateRange(startDate, endDate) {
  const result = [];
  let current = startDate;
  while (current <= endDate) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}

/**
 * Compara dos strings de fecha.
 * @returns {number} negativo si a < b, 0 si iguales, positivo si a > b
 */
export function compareDates(a, b) {
  return a.localeCompare(b);
}

/**
 * Devuelve el nombre del día de la semana en español (abreviado).
 * @param {string} dateString
 * @returns {string}
 */
export function weekDayName(dateString) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const d = parseDate(dateString);
  return days[d.getDay()];
}

/**
 * Devuelve el nombre del mes en español.
 * @param {string} dateString 'YYYY-MM-DD' o 'YYYY-MM'
 * @returns {string}
 */
export function monthName(dateString) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthIndex = parseInt(dateString.substring(5, 7), 10) - 1;
  return months[monthIndex];
}
