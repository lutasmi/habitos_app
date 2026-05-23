// ============================================================
// Code.gs — Google Apps Script para la app de hábitos
// Desplegado como Web App (ejecutar como: Yo, acceso: Cualquiera)
// ============================================================

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------

const SHEET_NAMES = {
  CONFIG_HABIT_GROUPS: 'CONFIG_HABIT_GROUPS',
  CONFIG_HABITS: 'CONFIG_HABITS',
  CONFIG_ACTIVITY_GROUPS: 'CONFIG_ACTIVITY_GROUPS',
  CONFIG_ACTIVITIES: 'CONFIG_ACTIVITIES',
  CONFIG_DAY_TYPES: 'CONFIG_DAY_TYPES',
  CONFIG_SCORE: 'CONFIG_SCORE',
  APP_SETTINGS: 'APP_SETTINGS',
  DAILY_RECORDS: 'DAILY_RECORDS',
  DAILY_HABIT_VALUES: 'DAILY_HABIT_VALUES',
  ACTIVITY_LOG: 'ACTIVITY_LOG',
  CHANGE_LOG: 'CHANGE_LOG',
};

// ------------------------------------------------------------
// PUNTO DE ENTRADA GET
// ------------------------------------------------------------

function doGet(e) {
  const action = e.parameter.action || '';

  try {
    switch (action) {
      case 'ping':
        return jsonResponse({ ok: true, data: { pong: true }, message: 'Conexión correcta' });

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

  const action = body.action || '';
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
      'open_by_default', 'active', 'visible', 'created_at', 'updated_at'
    ],
    CONFIG_HABITS: [
      'habit_id', 'group_id', 'name', 'description', 'type',
      'target_value', 'unit', 'positive_rule', 'score_weight',
      'score_min', 'score_max', 'color', 'sort_order',
      'active', 'visible', 'created_at', 'updated_at'
    ],
    CONFIG_ACTIVITY_GROUPS: [
      'group_id', 'name', 'emoji', 'color', 'sort_order',
      'active', 'visible', 'created_at', 'updated_at'
    ],
    CONFIG_ACTIVITIES: [
      'activity_id', 'group_id', 'name', 'description',
      'target_value', 'target_period', 'target_unit',
      'requires_duration', 'requires_distance', 'requires_comment',
      'color', 'sort_order', 'active', 'visible', 'created_at', 'updated_at'
    ],
    CONFIG_DAY_TYPES: [
      'day_type_id', 'name', 'emoji', 'color', 'sort_order', 'active', 'visible'
    ],
    CONFIG_SCORE: [
      'rule_id', 'scope', 'min_value', 'max_value', 'color', 'label', 'sort_order', 'active'
    ],
    APP_SETTINGS: [
      'setting_key', 'setting_value', 'description', 'updated_at'
    ],
    DAILY_RECORDS: [
      'date', 'day_type_id', 'note', 'score_day', 'score_week', 'score_month',
      'updated_at', 'updated_by'
    ],
    DAILY_HABIT_VALUES: [
      'date', 'habit_id', 'value', 'status', 'score_value', 'updated_at', 'updated_by'
    ],
    ACTIVITY_LOG: [
      'activity_log_id', 'date', 'activity_id', 'duration_min', 'distance_km',
      'comment', 'created_at', 'updated_at', 'updated_by'
    ],
    CHANGE_LOG: [
      'change_id', 'timestamp', 'sheet_name', 'entity_id', 'action',
      'previous_value', 'new_value', 'source', 'user'
    ],
  };

  Object.entries(schemas).forEach(([name, expectedHeaders]) => {
    ensureSheetSchema(name, expectedHeaders);
  });
}

/**
 * Garantiza que una hoja existe y tiene al menos las columnas esperadas.
 *
 * Comportamiento:
 * - Si la hoja no existe: la crea con todas las cabeceras en negrita.
 * - Si la hoja existe: compara fila 1 con expectedHeaders y añade al final
 *   las columnas que falten. No borra columnas existentes, no reordena,
 *   no toca datos.
 *
 * Esto permite que el modelo de datos evolucione sin romper instancias
 * ya desplegadas de Google Sheets.
 *
 * @param {string} sheetName - Nombre de la hoja
 * @param {string[]} expectedHeaders - Columnas que deben existir (en orden preferido)
 */
function ensureSheetSchema(sheetName, expectedHeaders) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // Hoja nueva: crear con todas las cabeceras
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
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
    Logger.log(`[setup] Hoja OK: ${sheetName} (sin columnas faltantes)`);
    return;
  }

  // Añadir columnas faltantes al final, en negrita, sin tocar datos existentes
  const startCol = lastCol + 1;
  missingHeaders.forEach((header, i) => {
    const col = startCol + i;
    sheet.getRange(1, col).setValue(header).setFontWeight('bold');
  });

  Logger.log(
    `[setup] Hoja actualizada: ${sheetName} — columnas añadidas: ${missingHeaders.join(', ')}`
  );
}

// ------------------------------------------------------------
// LECTURA COMPLETA
// ------------------------------------------------------------

function readAll() {
  return {
    config: readConfig(),
    dailyRecords: readDailyRecords(),
    dailyHabitValues: readDailyHabitValues(),
    activityLog: readActivityLog(),
  };
}

function readConfig() {
  return {
    habitGroups: sheetToObjects(SHEET_NAMES.CONFIG_HABIT_GROUPS),
    habits: sheetToObjects(SHEET_NAMES.CONFIG_HABITS),
    activityGroups: sheetToObjects(SHEET_NAMES.CONFIG_ACTIVITY_GROUPS),
    activities: sheetToObjects(SHEET_NAMES.CONFIG_ACTIVITIES),
    dayTypes: sheetToObjects(SHEET_NAMES.CONFIG_DAY_TYPES),
    scoreRules: sheetToObjects(SHEET_NAMES.CONFIG_SCORE),
    appSettings: sheetToObjects(SHEET_NAMES.APP_SETTINGS),
  };
}

function readDailyRecords() {
  return sheetToObjects(SHEET_NAMES.DAILY_RECORDS);
}

function readDailyHabitValues() {
  return sheetToObjects(SHEET_NAMES.DAILY_HABIT_VALUES);
}

function readActivityLog() {
  return sheetToObjects(SHEET_NAMES.ACTIVITY_LOG);
}

// ------------------------------------------------------------
// ESCRITURA
// ------------------------------------------------------------

/**
 * Guarda o actualiza el registro diario y los valores de hábitos.
 * payload = {
 *   date: 'YYYY-MM-DD',
 *   day_type_id: string,
 *   note: string,
 *   habitValues: [{ habit_id, value, status, score_value }],
 *   score_day: number,
 *   score_week: number,
 *   score_month: number,
 * }
 */
function saveDailyPayload(payload) {
  const now = new Date().toISOString();
  const date = payload.date;

  if (!date) throw new Error('Falta el campo "date" en el payload');

  // --- DAILY_RECORDS ---
  const dailySheet = getSheet(SHEET_NAMES.DAILY_RECORDS);
  const dailyHeaders = getHeaders(dailySheet);
  const dailyRows = dailySheet.getDataRange().getValues();

  const dateCol = dailyHeaders.indexOf('date');
  let existingDailyRow = -1;
  for (let i = 1; i < dailyRows.length; i++) {
    if (String(dailyRows[i][dateCol]) === date) {
      existingDailyRow = i + 1; // 1-indexed para Sheets
      break;
    }
  }

  const dailyRecord = {
    date: date,
    day_type_id: payload.day_type_id || '',
    note: payload.note || '',
    score_day: payload.score_day ?? '',
    score_week: payload.score_week ?? '',
    score_month: payload.score_month ?? '',
    updated_at: now,
    updated_by: 'app',
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
    sheet_name: SHEET_NAMES.DAILY_RECORDS,
    entity_id: date,
    action: existingDailyRow > 0 ? 'update' : 'create',
    previous_value: JSON.stringify(prevDailyValue),
    new_value: JSON.stringify(dailyRecord),
    source: 'app',
  });

  // --- DAILY_HABIT_VALUES ---
  if (payload.habitValues && Array.isArray(payload.habitValues)) {
    const hvSheet = getSheet(SHEET_NAMES.DAILY_HABIT_VALUES);
    const hvHeaders = getHeaders(hvSheet);
    const hvRows = hvSheet.getDataRange().getValues();

    const hvDateCol = hvHeaders.indexOf('date');
    const hvHabitCol = hvHeaders.indexOf('habit_id');

    payload.habitValues.forEach(hv => {
      let existingRow = -1;
      for (let i = 1; i < hvRows.length; i++) {
        if (String(hvRows[i][hvDateCol]) === date && String(hvRows[i][hvHabitCol]) === hv.habit_id) {
          existingRow = i + 1;
          break;
        }
      }

      const hvRecord = {
        date: date,
        habit_id: hv.habit_id,
        value: String(hv.value ?? ''),
        status: hv.status || 'empty',
        score_value: hv.score_value ?? 0,
        updated_at: now,
        updated_by: 'app',
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
        sheet_name: SHEET_NAMES.DAILY_HABIT_VALUES,
        entity_id: `${date}_${hv.habit_id}`,
        action: existingRow > 0 ? 'update' : 'create',
        previous_value: JSON.stringify(prevHvValue),
        new_value: JSON.stringify(hvRecord),
        source: 'app',
      });
    });
  }
}

/**
 * Guarda un registro de actividad. Idempotente: upsert por activity_log_id.
 *
 * El cliente DEBE generar el activity_log_id antes de enviar y conservarlo
 * durante reintentos. Si el mismo ID llega dos veces, el servidor actualiza
 * la fila existente en lugar de crear un duplicado.
 *
 * payload = {
 *   activity_log_id: string,  // OBLIGATORIO — generado por el cliente
 *   date: 'YYYY-MM-DD',
 *   activity_id: string,
 *   duration_min: number,     // opcional
 *   distance_km: number,      // opcional
 *   comment: string,          // opcional
 * }
 *
 * CHANGE_LOG registra:
 *   - action: 'create' si el ID no existía
 *   - action: 'update' si el ID ya existía (reintento)
 */
function saveActivityPayload(payload) {
  // Validación: activity_log_id es obligatorio
  if (!payload.activity_log_id) {
    throw new Error(
      'Falta activity_log_id en el payload de actividad. ' +
      'El cliente debe generar el ID antes de enviar (usar generateActivityLogId).'
    );
  }
  if (!payload.date) {
    throw new Error('Falta el campo "date" en el payload de actividad.');
  }
  if (!payload.activity_id) {
    throw new Error('Falta el campo "activity_id" en el payload de actividad.');
  }

  const now = new Date().toISOString();
  const sheet = getSheet(SHEET_NAMES.ACTIVITY_LOG);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();

  // Buscar fila existente por activity_log_id
  const idCol = headers.indexOf('activity_log_id');
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === payload.activity_log_id) {
      existingRow = i + 1; // 1-indexed para Sheets
      break;
    }
  }

  const isNew = existingRow === -1;

  // Construir registro
  const record = {
    activity_log_id: payload.activity_log_id,
    date: payload.date,
    activity_id: payload.activity_id,
    duration_min: payload.duration_min ?? '',
    distance_km: payload.distance_km ?? '',
    comment: payload.comment || '',
    // created_at: solo se escribe en insert; en update se conserva la original
    created_at: isNew ? now : String(rows[existingRow - 1][headers.indexOf('created_at')] || now),
    updated_at: now,
    updated_by: 'app',
  };

  const prevValue = isNew ? null : rowToObject(rows[existingRow - 1], headers);

  if (isNew) {
    appendObject(sheet, headers, record);
  } else {
    setRowValues(sheet, existingRow, headers, record);
  }

  appendChangeLog({
    sheet_name: SHEET_NAMES.ACTIVITY_LOG,
    entity_id: payload.activity_log_id,
    action: isNew ? 'create' : 'update',
    previous_value: JSON.stringify(prevValue),
    new_value: JSON.stringify(record),
    source: 'app',
  });
}

/**
 * Guarda o actualiza configuración.
 * payload = {
 *   sheetName: string,  // nombre de la hoja CONFIG_*
 *   records: [{}],      // array de objetos a upsert por su clave primaria
 *   primaryKey: string, // columna que identifica unívocamente cada fila
 * }
 */
function saveConfigPayload(payload) {
  const { sheetName, records, primaryKey } = payload;

  if (!sheetName || !records || !primaryKey) {
    throw new Error('saveConfigPayload requiere sheetName, records y primaryKey');
  }

  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  const pkCol = headers.indexOf(primaryKey);

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
      sheet_name: sheetName,
      entity_id: String(pkValue),
      action: existingRow > 0 ? 'update' : 'create',
      previous_value: JSON.stringify(prevValue),
      new_value: JSON.stringify(record),
      source: 'app',
    });
  });
}

// ------------------------------------------------------------
// CHANGE LOG
// ------------------------------------------------------------

function appendChangeLog(change) {
  const sheet = getSheet(SHEET_NAMES.CHANGE_LOG);
  const headers = getHeaders(sheet);

  const record = {
    change_id: generateId('chg'),
    timestamp: new Date().toISOString(),
    sheet_name: change.sheet_name || '',
    entity_id: change.entity_id || '',
    action: change.action || '',
    previous_value: change.previous_value || '',
    new_value: change.new_value || '',
    source: change.source || 'app',
    user: change.user || '',
  };

  appendObject(sheet, headers, record);
}

// ------------------------------------------------------------
// UTILIDADES INTERNAS
// ------------------------------------------------------------

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Hoja no encontrada: ${name}. Ejecuta ?action=setup primero.`);
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(String);
  return data.slice(1).map(row => rowToObject(row, headers));
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? String(row[i]) : '';
  });
  return obj;
}

function appendObject(sheet, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function setRowValues(sheet, rowIndex, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function generateId(prefix) {
  const ts = new Date().getTime();
  const rand = Math.floor(Math.random() * 10000);
  return `${prefix}_${ts}_${rand}`;
}

function jsonResponse(obj) {
  obj.serverUpdatedAt = new Date().toISOString();
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
