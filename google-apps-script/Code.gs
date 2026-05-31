// ============================================================
// Code.gs — Google Apps Script para la app de hábitos
// Desplegado como Web App (ejecutar como: Yo, acceso: Cualquiera)
// ============================================================

// ------------------------------------------------------------
// VERSIÓN — cambiar en cada despliegue relevante
// ------------------------------------------------------------

const APP_SCRIPT_VERSION = 'phase2-date-upsert-v3';

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------

const SHEET_NAMES = {
  CONFIG_HABIT_GROUPS:   'CONFIG_HABIT_GROUPS',
  CONFIG_HABITS:         'CONFIG_HABITS',
  CONFIG_ACTIVITY_GROUPS:'CONFIG_ACTIVITY_GROUPS',
  CONFIG_ACTIVITIES:     'CONFIG_ACTIVITIES',
  CONFIG_DAY_TYPES:      'CONFIG_DAY_TYPES',
  CONFIG_SCORE:          'CONFIG_SCORE',
  APP_SETTINGS:          'APP_SETTINGS',
  DAILY_RECORDS:         'DAILY_RECORDS',
  DAILY_HABIT_VALUES:    'DAILY_HABIT_VALUES',
  ACTIVITY_LOG:          'ACTIVITY_LOG',
  CHANGE_LOG:            'CHANGE_LOG',
};

// Hojas que tienen una columna 'date' que debe tratarse como texto YYYY-MM-DD
const DATE_TEXT_SHEETS = new Set([
  'DAILY_RECORDS',
  'DAILY_HABIT_VALUES',
  'ACTIVITY_LOG',
]);

// Headers que deben serializarse como YYYY-MM-DD (nunca como Date object)
const DATE_ONLY_HEADERS = new Set(['date']);

// Headers que deben serializarse como ISO 8601 si son Date objects
const DATETIME_HEADERS = new Set(['created_at', 'updated_at', 'timestamp']);

// ------------------------------------------------------------
// PUNTO DE ENTRADA GET
// ------------------------------------------------------------

function doGet(e) {
  const action = e.parameter.action || '';

  try {
    switch (action) {
      case 'ping':
        return jsonResponse({
          ok: true,
          data: { pong: true, version: APP_SCRIPT_VERSION },
          message: 'Conexión correcta',
        });

      case 'setup':
        setupSheets();
        return jsonResponse({ ok: true, data: {}, message: 'Hojas creadas o verificadas correctamente' });

      case 'read_all':
        return jsonResponse({ ok: true, data: readAll(), message: '' });

      default:
        return jsonResponse({ ok: false, error: `Acción GET desconocida: "${action}"` });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ------------------------------------------------------------
// PUNTO DE ENTRADA POST
// ------------------------------------------------------------

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'JSON inválido en el body' });
  }

  const action  = body.action  || '';
  const payload = body.payload || {};

  try {
    switch (action) {
      case 'save_daily':
        saveDailyPayload(payload);
        return jsonResponse({ ok: true, data: {}, message: 'Registro diario guardado' });

      case 'save_activity':
        saveActivityPayload(payload);
        return jsonResponse({ ok: true, data: {}, message: 'Actividad guardada' });

      case 'save_config':
        saveConfigPayload(payload);
        return jsonResponse({ ok: true, data: {}, message: 'Configuración guardada' });

      case 'delete_activity_log':
        deleteActivityLogPayload(payload);
        return jsonResponse({ ok: true, data: {}, message: 'Registro de actividad eliminado' });

      default:
        return jsonResponse({ ok: false, error: `Acción POST desconocida: "${action}"` });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ------------------------------------------------------------
// SETUP DE HOJAS
// ------------------------------------------------------------

function setupSheets() {
  const schemas = {
    CONFIG_HABIT_GROUPS: [
      'group_id', 'name', 'emoji', 'color', 'sort_order',
      'open_by_default', 'active', 'visible', 'created_at', 'updated_at',
    ],
    CONFIG_HABITS: [
      'habit_id', 'group_id', 'name', 'description', 'type',
      'target_value', 'unit', 'positive_rule', 'score_weight',
      'score_min', 'score_max', 'color', 'sort_order',
      'active', 'visible', 'created_at', 'updated_at',
    ],
    CONFIG_ACTIVITY_GROUPS: [
      'group_id', 'name', 'emoji', 'color', 'sort_order',
      'active', 'visible', 'created_at', 'updated_at',
    ],
    CONFIG_ACTIVITIES: [
      'activity_id', 'group_id', 'name', 'description',
      'target_value', 'target_period', 'target_unit',
      'requires_duration', 'requires_distance', 'requires_comment',
      'color', 'sort_order', 'active', 'visible', 'created_at', 'updated_at',
    ],
    CONFIG_DAY_TYPES: [
      'day_type_id', 'name', 'emoji', 'color', 'sort_order', 'active', 'visible',
    ],
    CONFIG_SCORE: [
      'rule_id', 'scope', 'min_value', 'max_value', 'color', 'label', 'sort_order', 'active',
    ],
    APP_SETTINGS: [
      'setting_key', 'setting_value', 'description', 'updated_at',
    ],
    DAILY_RECORDS: [
      'date', 'day_type_id', 'note', 'score_day', 'score_week', 'score_month',
      'updated_at', 'updated_by',
    ],
    DAILY_HABIT_VALUES: [
      'date', 'habit_id', 'value', 'status', 'score_value', 'updated_at', 'updated_by',
    ],
    ACTIVITY_LOG: [
      'activity_log_id', 'date', 'activity_id', 'duration_min', 'distance_km',
      'comment', 'created_at', 'updated_at', 'updated_by',
    ],
    CHANGE_LOG: [
      'change_id', 'timestamp', 'sheet_name', 'entity_id', 'action',
      'previous_value', 'new_value', 'source', 'user',
    ],
  };

  Object.entries(schemas).forEach(([name, expectedHeaders]) => {
    ensureSheetSchema(name, expectedHeaders);
  });
}

/**
 * Garantiza que una hoja existe y tiene al menos las columnas esperadas.
 *
 * - Si la hoja no existe: la crea con las cabeceras y formatea la columna
 *   'date' como texto plano para evitar auto-conversión de Sheets.
 * - Si la hoja existe: detecta columnas faltantes y las añade al final.
 *   No borra ni reordena columnas existentes, no toca datos.
 *
 * @param {string}   sheetName       Nombre de la hoja
 * @param {string[]} expectedHeaders Columnas que deben existir
 */
function ensureSheetSchema(sheetName, expectedHeaders) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');

    // Formatear columna 'date' como texto para evitar auto-conversión
    if (DATE_TEXT_SHEETS.has(sheetName)) {
      applyDateColumnTextFormat(sheet, expectedHeaders);
    }

    Logger.log(`[setup] Hoja creada: ${sheetName} (${expectedHeaders.length} columnas)`);
    return;
  }

  // Hoja existente: detectar columnas faltantes
  const lastCol = sheet.getLastColumn();
  const existingHeaders = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
    : [];

  const missingHeaders = expectedHeaders.filter(h => !existingHeaders.includes(h));

  if (missingHeaders.length === 0) {
    // Aunque no falten columnas, asegurar formato texto en columna date
    if (DATE_TEXT_SHEETS.has(sheetName)) {
      applyDateColumnTextFormat(sheet, existingHeaders);
    }
    Logger.log(`[setup] Hoja OK: ${sheetName}`);
    return;
  }

  const startCol = lastCol + 1;
  missingHeaders.forEach((header, i) => {
    sheet.getRange(1, startCol + i).setValue(header).setFontWeight('bold');
  });

  const allHeaders = existingHeaders.concat(missingHeaders);
  if (DATE_TEXT_SHEETS.has(sheetName)) {
    applyDateColumnTextFormat(sheet, allHeaders);
  }

  Logger.log(`[setup] Hoja actualizada: ${sheetName} — añadidas: ${missingHeaders.join(', ')}`);
}

/**
 * Formatea la columna 'date' de una hoja como texto plano (@STRING@).
 * Esto previene que Google Sheets convierta strings YYYY-MM-DD a Date objects
 * en escrituras futuras. Las celdas existentes que ya son Date no cambian
 * de valor, pero normalizeDateKey() las manejará en lectura.
 *
 * @param {Sheet}    sheet
 * @param {string[]} headers
 */
function applyDateColumnTextFormat(sheet, headers) {
  const dateColIdx = headers.indexOf('date');
  if (dateColIdx < 0) return;
  const maxRows = sheet.getMaxRows();
  if (maxRows < 2) return;
  // Aplica desde fila 2 (saltando cabecera) hasta el final de la hoja
  sheet.getRange(2, dateColIdx + 1, maxRows - 1, 1).setNumberFormat('@STRING@');
}

// ------------------------------------------------------------
// LECTURA COMPLETA
// ------------------------------------------------------------

function readAll() {
  return {
    config:           readConfig(),
    dailyRecords:     readDailyRecords(),
    dailyHabitValues: readDailyHabitValues(),
    activityLog:      readActivityLog(),
    changeLog:        readChangeLog(),
  };
}

function readConfig() {
  return {
    habitGroups:  sheetToObjects(SHEET_NAMES.CONFIG_HABIT_GROUPS),
    habits:       sheetToObjects(SHEET_NAMES.CONFIG_HABITS),
    activityGroups: sheetToObjects(SHEET_NAMES.CONFIG_ACTIVITY_GROUPS),
    activities:   sheetToObjects(SHEET_NAMES.CONFIG_ACTIVITIES),
    dayTypes:     sheetToObjects(SHEET_NAMES.CONFIG_DAY_TYPES),
    scoreRules:   sheetToObjects(SHEET_NAMES.CONFIG_SCORE),
    appSettings:  sheetToObjects(SHEET_NAMES.APP_SETTINGS),
  };
}

function readDailyRecords()     { return sheetToObjects(SHEET_NAMES.DAILY_RECORDS);     }
function readDailyHabitValues() { return sheetToObjects(SHEET_NAMES.DAILY_HABIT_VALUES); }
function readActivityLog()      { return sheetToObjects(SHEET_NAMES.ACTIVITY_LOG);       }
function readChangeLog()        { return sheetToObjects(SHEET_NAMES.CHANGE_LOG);         }

// ------------------------------------------------------------
// NORMALIZACIÓN DE FECHAS
// ------------------------------------------------------------

/**
 * Normaliza cualquier valor de celda que represente una fecha a 'YYYY-MM-DD'.
 *
 * Google Sheets convierte automáticamente strings como '2024-01-15' a objetos
 * Date internos. getDataRange().getValues() los devuelve como Date de JS.
 * String(Date) produce "Mon Jan 15 2024 00:00:00 GMT+..." → la comparación
 * de upsert falla → appendRow → duplicado.
 *
 * CRÍTICO — timezone:
 * Se usa el timezone del spreadsheet (no del script) para evitar desfases
 * de un día en usuarios con UTC offset negativo o positivo.
 *
 * @param {any} value  Valor crudo de celda: Date object, string ISO, string largo, etc.
 * @returns {string}   'YYYY-MM-DD' o '' si el valor está vacío/inválido
 */
function normalizeDateKey(value) {
  if (value === null || value === undefined || value === '') return '';

  // Caso 1: objeto Date devuelto por getValues()
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );
  }

  const str = String(value).trim();
  if (!str) return '';

  // Caso 2: ya es YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss...
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Caso 3: string largo tipo "Sun May 24 2026 00:00:00 GMT+..." → parsear como Date
  const parsed = new Date(str);
  if (!isNaN(parsed)) {
    return Utilities.formatDate(
      parsed,
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );
  }

  // Fallback: tomar los primeros 10 caracteres
  return str.slice(0, 10);
}

/**
 * Normaliza un valor de celda de tipo datetime a ISO 8601.
 * Para campos como created_at, updated_at, timestamp.
 *
 * @param {any} value
 * @returns {string}
 */
function normalizeIsoTimestamp(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value.toISOString();
  }
  return String(value).trim();
}

// ------------------------------------------------------------
// ESCRITURA — DAILY
// ------------------------------------------------------------

/**
 * Guarda o actualiza el registro diario y los valores de hábitos.
 * Upsert por 'date'            → DAILY_RECORDS (1 fila por fecha)
 * Upsert por 'date + habit_id' → DAILY_HABIT_VALUES (1 fila por fecha+hábito)
 *
 * La comparación usa normalizeDateKey() en el valor de celda para manejar
 * correctamente las celdas que Sheets haya convertido a objetos Date.
 *
 * payload = {
 *   date:         'YYYY-MM-DD',
 *   day_type_id:  string,
 *   note:         string,
 *   habitValues:  [{ habit_id, value, status, score_value }],
 *   score_day:    number,
 *   score_week:   number,
 *   score_month:  number,
 * }
 */
function saveDailyPayload(payload) {
  const now  = new Date().toISOString();
  const date = payload.date;

  if (!date) throw new Error('Falta el campo "date" en el payload');

  // Normalizar la fecha del payload una sola vez — clave de todas las comparaciones
  const normalizedDate = normalizeDateKey(date);
  if (!normalizedDate) throw new Error(`Fecha inválida en el payload: "${date}"`);

  // ── DAILY_RECORDS ──────────────────────────────────────────

  const dailySheet   = getSheet(SHEET_NAMES.DAILY_RECORDS);
  const dailyHeaders = getHeaders(dailySheet);
  const dailyRows    = dailySheet.getDataRange().getValues();
  const dateCol      = dailyHeaders.indexOf('date');

  let existingDailyRow = -1;
  for (let i = 1; i < dailyRows.length; i++) {
    if (normalizeDateKey(dailyRows[i][dateCol]) === normalizedDate) {
      existingDailyRow = i + 1; // 1-indexed para Sheets API
      break;
    }
  }

  const dailyRecord = {
    date:         normalizedDate,          // siempre string YYYY-MM-DD
    day_type_id:  payload.day_type_id  || '',
    note:         payload.note         || '',
    score_day:    payload.score_day    ?? '',
    score_week:   payload.score_week   ?? '',
    score_month:  payload.score_month  ?? '',
    updated_at:   now,
    updated_by:   'app',
  };

  const prevDailyValue = existingDailyRow > 0
    ? rowToObject(dailyRows[existingDailyRow - 1], dailyHeaders)
    : null;

  if (existingDailyRow > 0) {
    setRowValues(dailySheet, existingDailyRow, dailyHeaders, dailyRecord);
  } else {
    appendObject(dailySheet, dailyHeaders, dailyRecord);
  }

  appendChangeLog({
    sheet_name:     SHEET_NAMES.DAILY_RECORDS,
    entity_id:      normalizedDate,
    action:         existingDailyRow > 0 ? 'update' : 'create',
    previous_value: JSON.stringify(prevDailyValue),
    new_value:      JSON.stringify(dailyRecord),
    source:         'app',
  });

  // ── DAILY_HABIT_VALUES ─────────────────────────────────────

  if (Array.isArray(payload.habitValues) && payload.habitValues.length > 0) {
    const hvSheet   = getSheet(SHEET_NAMES.DAILY_HABIT_VALUES);
    const hvHeaders = getHeaders(hvSheet);
    const hvRows    = hvSheet.getDataRange().getValues();
    const hvDateCol = hvHeaders.indexOf('date');
    const hvHabitCol= hvHeaders.indexOf('habit_id');

    payload.habitValues.forEach(hv => {
      const hvDate   = normalizeDateKey(hv.date || normalizedDate);
      const habitId  = String(hv.habit_id || '').trim();

      let existingRow = -1;
      for (let i = 1; i < hvRows.length; i++) {
        if (
          normalizeDateKey(hvRows[i][hvDateCol]) === hvDate &&
          String(hvRows[i][hvHabitCol]).trim()   === habitId
        ) {
          existingRow = i + 1;
          break;
        }
      }

      const hvRecord = {
        date:        hvDate,              // siempre string YYYY-MM-DD
        habit_id:    habitId,
        value:       String(hv.value  ?? ''),
        status:      hv.status          || 'empty',
        score_value: hv.score_value     ?? 0,
        updated_at:  now,
        updated_by:  'app',
      };

      const prevHvValue = existingRow > 0
        ? rowToObject(hvRows[existingRow - 1], hvHeaders)
        : null;

      if (existingRow > 0) {
        setRowValues(hvSheet, existingRow, hvHeaders, hvRecord);
      } else {
        appendObject(hvSheet, hvHeaders, hvRecord);
      }

      appendChangeLog({
        sheet_name:     SHEET_NAMES.DAILY_HABIT_VALUES,
        entity_id:      `${hvDate}_${habitId}`,
        action:         existingRow > 0 ? 'update' : 'create',
        previous_value: JSON.stringify(prevHvValue),
        new_value:      JSON.stringify(hvRecord),
        source:         'app',
      });
    });
  }
}

// ------------------------------------------------------------
// ESCRITURA — ACTIVIDADES
// ------------------------------------------------------------

/**
 * Guarda un registro de actividad. Idempotente: upsert por activity_log_id.
 *
 * El cliente DEBE generar el activity_log_id antes de enviar y conservarlo
 * durante reintentos. Si el mismo ID llega dos veces, el servidor actualiza
 * la fila existente en lugar de crear un duplicado.
 *
 * payload = {
 *   activity_log_id: string,  // OBLIGATORIO — generado por el cliente
 *   date:            'YYYY-MM-DD',
 *   activity_id:     string,
 *   duration_min:    number,  // opcional
 *   distance_km:     number,  // opcional
 *   comment:         string,  // opcional
 * }
 */
function saveActivityPayload(payload) {
  if (!payload.activity_log_id) {
    throw new Error(
      'Falta activity_log_id en el payload de actividad. ' +
      'El cliente debe generar el ID antes de enviar (usar generateActivityLogId).'
    );
  }
  if (!payload.date)        throw new Error('Falta "date" en el payload de actividad.');
  if (!payload.activity_id) throw new Error('Falta "activity_id" en el payload de actividad.');

  const now   = new Date().toISOString();
  const sheet = getSheet(SHEET_NAMES.ACTIVITY_LOG);
  const headers = getHeaders(sheet);
  const rows    = sheet.getDataRange().getValues();
  const idCol   = headers.indexOf('activity_log_id');

  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === payload.activity_log_id) {
      existingRow = i + 1;
      break;
    }
  }

  const isNew = existingRow === -1;

  const record = {
    activity_log_id: payload.activity_log_id,
    date:            normalizeDateKey(payload.date),
    activity_id:     payload.activity_id,
    duration_min:    payload.duration_min ?? '',
    distance_km:     payload.distance_km  ?? '',
    comment:         payload.comment      || '',
    created_at:      isNew
                       ? now
                       : normalizeIsoTimestamp(rows[existingRow - 1][headers.indexOf('created_at')]) || now,
    updated_at:      now,
    updated_by:      'app',
  };

  const prevValue = isNew ? null : rowToObject(rows[existingRow - 1], headers);

  if (isNew) {
    appendObject(sheet, headers, record);
  } else {
    setRowValues(sheet, existingRow, headers, record);
  }

  appendChangeLog({
    sheet_name:     SHEET_NAMES.ACTIVITY_LOG,
    entity_id:      payload.activity_log_id,
    action:         isNew ? 'create' : 'update',
    previous_value: JSON.stringify(prevValue),
    new_value:      JSON.stringify(record),
    source:         'app',
  });
}

// ------------------------------------------------------------
// ESCRITURA — CONFIGURACIÓN
// ------------------------------------------------------------

/**
 * Guarda o actualiza configuración. Upsert por primaryKey.
 * payload = {
 *   sheetName:  string,   // nombre de la hoja CONFIG_*
 *   records:    [{}],     // array de objetos a upsert
 *   primaryKey: string,   // columna que identifica cada fila
 * }
 */
function saveConfigPayload(payload) {
  const { sheetName, records, primaryKey } = payload;
  if (!sheetName || !records || !primaryKey) {
    throw new Error('saveConfigPayload requiere sheetName, records y primaryKey');
  }

  const sheet   = getSheet(sheetName);
  const headers = getHeaders(sheet);
  const rows    = sheet.getDataRange().getValues();
  const pkCol   = headers.indexOf(primaryKey);
  if (pkCol === -1) throw new Error(`Columna "${primaryKey}" no encontrada en ${sheetName}`);

  const now = new Date().toISOString();

  records.forEach(record => {
    record.updated_at = now;
    const pkValue = record[primaryKey];
    let existingRow = -1;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][pkCol]) === String(pkValue)) {
        existingRow = i + 1;
        break;
      }
    }

    const prevValue = existingRow > 0
      ? rowToObject(rows[existingRow - 1], headers)
      : null;

    if (existingRow > 0) {
      setRowValues(sheet, existingRow, headers, record);
    } else {
      if (!record.created_at) record.created_at = now;
      appendObject(sheet, headers, record);
    }

    appendChangeLog({
      sheet_name:     sheetName,
      entity_id:      String(pkValue),
      action:         existingRow > 0 ? 'update' : 'create',
      previous_value: JSON.stringify(prevValue),
      new_value:      JSON.stringify(record),
      source:         'app',
    });
  });
}

// ------------------------------------------------------------
// BORRADO — ACTIVITY_LOG
// ------------------------------------------------------------

/**
 * Elimina una fila concreta de ACTIVITY_LOG por activity_log_id.
 *
 * IMPORTANTE: No borra CONFIG_ACTIVITIES, CONFIG_ACTIVITY_GROUPS,
 * DAILY_RECORDS ni DAILY_HABIT_VALUES. Solo opera sobre ACTIVITY_LOG.
 *
 * payload = { activity_log_id: string }
 */
function deleteActivityLogPayload(payload) {
  if (!payload.activity_log_id) {
    throw new Error('Falta activity_log_id en el payload de borrado.');
  }

  const sheet   = getSheet(SHEET_NAMES.ACTIVITY_LOG);
  const headers = getHeaders(sheet);
  const rows    = sheet.getDataRange().getValues();
  const idCol   = headers.indexOf('activity_log_id');

  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === payload.activity_log_id) {
      targetRow = i + 1; // 1-indexed para Sheets API
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error(`activity_log_id "${payload.activity_log_id}" no encontrado en ACTIVITY_LOG.`);
  }

  // Capturar la fila completa antes de borrarla para el CHANGE_LOG
  const previousValue = rowToObject(rows[targetRow - 1], headers);

  // Borrar la fila físicamente de ACTIVITY_LOG
  sheet.deleteRow(targetRow);

  // Registrar el borrado en CHANGE_LOG
  appendChangeLog({
    sheet_name:     SHEET_NAMES.ACTIVITY_LOG,
    entity_id:      payload.activity_log_id,
    action:         'delete',
    previous_value: JSON.stringify(previousValue),
    new_value:      JSON.stringify(null),
    source:         'app',
  });
}

// ------------------------------------------------------------
// CHANGE LOG
// ------------------------------------------------------------

function appendChangeLog(change) {
  const sheet   = getSheet(SHEET_NAMES.CHANGE_LOG);
  const headers = getHeaders(sheet);

  const record = {
    change_id:      generateId('chg'),
    timestamp:      new Date().toISOString(),
    sheet_name:     change.sheet_name     || '',
    entity_id:      change.entity_id      || '',
    action:         change.action         || '',
    previous_value: change.previous_value || '',
    new_value:      change.new_value      || '',
    source:         change.source         || 'app',
    user:           change.user           || '',
  };

  appendObject(sheet, headers, record);
}

// ------------------------------------------------------------
// UTILIDADES INTERNAS
// ------------------------------------------------------------

function getSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Hoja no encontrada: ${name}. Ejecuta ?action=setup primero.`);
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(String);
  return data.slice(1).map(row => rowToObject(row, headers));
}

/**
 * Convierte una fila de Sheets a objeto JS con tipos correctos.
 *
 * FIX CRÍTICO:
 * - Columnas con header 'date': normalizar a 'YYYY-MM-DD' usando normalizeDateKey()
 *   En lugar de String(Date) que produce "Sun May 24 2026 00:00:00 GMT+0200..."
 * - Columnas datetime (created_at, updated_at, timestamp): si son Date objects,
 *   devolver ISO 8601 en lugar del string largo.
 * - El resto: String() normal.
 *
 * @param {any[]}    row
 * @param {string[]} headers
 * @returns {object}
 */
function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    const val = row[i];
    if (val === undefined || val === null || val === '') {
      obj[h] = '';
    } else if (DATE_ONLY_HEADERS.has(h)) {
      obj[h] = normalizeDateKey(val);
    } else if (DATETIME_HEADERS.has(h)) {
      obj[h] = normalizeIsoTimestamp(val);
    } else {
      obj[h] = String(val);
    }
  });
  return obj;
}

function appendObject(sheet, headers, obj) {
  const row = headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(row);
}

function setRowValues(sheet, rowIndex, headers, obj) {
  const row = headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function generateId(prefix) {
  const ts   = new Date().getTime();
  const rand = Math.floor(Math.random() * 10000);
  return `${prefix}_${ts}_${rand}`;
}

function jsonResponse(obj) {
  obj.serverUpdatedAt = new Date().toISOString();
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
