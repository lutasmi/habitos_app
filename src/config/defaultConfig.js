/**
 * defaultConfig.js
 *
 * Configuración por defecto de la app.
 * Estos valores se usan cuando no hay datos en Google Sheets todavía.
 * NUNCA deben sobreescribir lo que venga de Sheets.
 */

export const defaultConfig = {
  appName: 'Hábitos',

  // URL del Apps Script desplegado como Web App.
  // Cámbiala por tu URL real después de desplegar Code.gs.
  // También puedes definirla en .env: VITE_APPS_SCRIPT_URL=...
  appsScriptUrl: import.meta.env.VITE_APPS_SCRIPT_URL || '',

  // Periodo por defecto para sincronizar registros diarios (días hacia atrás)
  syncLookbackDays: 90,

  // Tiempo máximo de espera para peticiones al Apps Script (ms)
  requestTimeoutMs: 15000,
};

/**
 * Tipos válidos de hábito.
 * Deben coincidir con los definidos en DATA_MODEL.md y en CONFIG_HABITS de Sheets.
 */
export const HABIT_TYPES = {
  BOOLEAN: 'boolean',
  COUNT: 'count',
  DECIMAL: 'decimal',
  RATING: 'rating',
};

/**
 * Reglas positivas válidas para hábitos.
 */
export const POSITIVE_RULES = {
  YES_IS_GOOD: 'yes_is_good',
  NO_IS_GOOD: 'no_is_good',
  GREATER_EQUAL_TARGET: 'greater_equal_target',
  LOWER_EQUAL_TARGET: 'lower_equal_target',
};

/**
 * Estados válidos para DAILY_HABIT_VALUES.
 */
export const HABIT_STATUS = {
  EMPTY: 'empty',
  DONE: 'done',
  NOT_DONE: 'not_done',
  NOT_APPLICABLE: 'not_applicable',
};

/**
 * Scopes válidos para el score.
 */
export const SCORE_SCOPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

/**
 * Periodos válidos para objetivos de actividades.
 */
export const ACTIVITY_PERIODS = {
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
};
