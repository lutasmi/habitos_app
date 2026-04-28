// ══════════════════════════════════════════════════════════════════════════════
// HABITOS APP — Google Apps Script
// Versión: 2.0
//
// Estructura de hojas:
//   KPIs         → Fila 1: IDs · Fila 2: Labels · Fila 3+: datos diarios
//   Hábitos      → una fila por actividad registrada
//   Configuración → volcado completo de la configuración de la app
//
// Instrucciones:
//   1. Google Sheet → Extensiones → Apps Script → pega este código
//   2. Implementar → Nueva implementación → App web
//      · Ejecutar como: Yo
//      · Acceso: Cualquiera
//   3. Autoriza permisos → copia la URL → pégala en la app (Config → Sheets)
//   4. En la app: Config → Sheets → Sincronizar config (primera vez)
// ══════════════════════════════════════════════════════════════════════════════

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === "read") {
    try {
      const ss      = SpreadsheetApp.getActiveSpreadsheet();
      const kpis    = readKpis(ss);
      const habitos = readHabitos(ss);
      const config  = readConfig(ss);
      return ContentService
        .createTextOutput(JSON.stringify({ status:"ok", kpis, habitos, config }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status:"error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status:"ok", message:"API activa" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readKpis(ss) {
  const sheet = ss.getSheetByName("KPIs");
  if (!sheet || sheet.getLastRow() < 3) return {};

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const ids     = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const data    = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

  // Calcular fecha límite — últimos 90 días
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const result = {};
  data.forEach(row => {
    const dateVal = row[0];
    if (!dateVal) return;
    let dateStr = "";
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dateStr = String(dateVal).trim();
    }
    if (!dateStr || dateStr < cutoffStr) return; // saltar días fuera de rango
    const obj = {};
    ids.forEach((id, i) => {
      if (i === 0) return;
      const val = row[i];
      if (val === "" || val === null) obj[id] = null;
      else if (val === 1) obj[id] = true;
      else if (val === 0) obj[id] = null;
      else obj[id] = val;
    });
    result[dateStr] = obj;
  });
  return result;
}

function readConfig(ss) {
  // La configuración se guarda como JSON en una hoja oculta Config_Raw
  try {
    const sheet = ss.getSheetByName("Config_Raw");
    if (!sheet) return null;
    const val = sheet.getRange(1, 1).getValue();
    if (!val) return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function writeConfigRaw(ss, kpiGroups, habGroups, dayTypes) {
  let sheet = ss.getSheetByName("Config_Raw");
  if (!sheet) {
    sheet = ss.insertSheet("Config_Raw");
    sheet.hideSheet(); // ocultar — es solo almacenamiento
  }
  const payload = JSON.stringify({ kpiGroups, habGroups, dayTypes, updatedAt: new Date().toISOString() });
  sheet.getRange(1, 1).setValue(payload);
}

function readHabitos(ss) {
  const sheet = ss.getSheetByName("Hábitos");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const lastRow = sheet.getLastRow();
  const data    = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const fields  = ["id","date","grupo","habito","comentario","veces","duracion","distancia"];

  return data
    .filter(row => row[0]) // filtrar filas vacías
    .map(row => {
      const obj = {};
      fields.forEach((f, i) => { obj[f] = row[i] || null; });
      return obj;
    });
}

function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === "kpis")       syncKpis(ss, data.rows);
    if (data.type === "habitos")    syncHabitos(ss, data.rows);
    if (data.type === "config")     syncConfig(ss, data.kpiGroups, data.habGroups, data.dayTypes);
    if (data.type === "kpi_labels") updateKpiLabels(ss, data.groups);

    return ok();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════════
// KPIs — Fila 1: IDs · Fila 2: Labels · Fila 3+: datos
// ══════════════════════════════════════════════════════════════════════════════

function syncKpis(ss, rows) {
  let sheet = ss.getSheetByName("KPIs");
  const isNew = !sheet;
  if (isNew) {
    sheet = ss.insertSheet("KPIs");
    // Fila 1: IDs técnicos fijos
    sheet.appendRow(["date", "last_modified"]);
    // Fila 2: Labels
    sheet.appendRow(["Fecha", "Última modificación"]);
    sheet.setFrozenRows(2);
    sheet.setFrozenColumns(1);
  }

  // Leer IDs actuales (fila 1) — recargamos siempre frescos
  let lastCol = Math.max(sheet.getLastColumn(), 1);
  let idRow   = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  // Asegurar que existe columna last_modified
  if (!idRow.includes("last_modified")) {
    const newCol = idRow.length + 1;
    sheet.getRange(1, newCol).setValue("last_modified");
    sheet.getRange(2, newCol).setValue("Última modificación");
    idRow.push("last_modified");
    lastCol = newCol;
  }

  // Para cada fila de datos entrante
  rows.forEach(row => {
    if (!row.date) return;

    // Añadir timestamp al row
    row["last_modified"] = new Date().toLocaleString("es-ES");

    // Asegurar que todas las columnas necesarias existen (por ID)
    Object.keys(row).forEach(fieldId => {
      if (!idRow.includes(fieldId)) {
        const newCol = idRow.length + 1;
        sheet.getRange(1, newCol).setValue(fieldId);
        sheet.getRange(2, newCol).setValue(fieldId); // se actualizará con kpi_labels
        idRow.push(fieldId);
      }
    });

    // Buscar fila existente por fecha — comparar como string YYYY-MM-DD
    const currentLastRow = sheet.getLastRow();
    let targetRow = -1;
    const duplicates = [];
    if (currentLastRow >= 3) {
      const dateVals = sheet.getRange(3, 1, currentLastRow - 2, 1).getValues();
      for (let i = 0; i < dateVals.length; i++) {
        const cellVal = dateVals[i][0];
        let cellStr = "";
        if (cellVal instanceof Date) {
          cellStr = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          cellStr = String(cellVal).trim();
        }
        if (cellStr === row.date) {
          if (targetRow === -1) {
            targetRow = i + 3; // primera coincidencia — aquí escribimos
          } else {
            duplicates.push(i + 3); // duplicados — los borramos
          }
        }
      }
    }

    // Borrar duplicados de abajo hacia arriba para no desplazar índices
    duplicates.reverse().forEach(dupRow => sheet.deleteRow(dupRow));

    // Si no existe ninguna fila para esta fecha, añadir nueva
    if (targetRow === -1) {
      targetRow = sheet.getLastRow() + 1;
    }

    // Escribir valores en la fila correcta
    idRow.forEach((id, colIdx) => {
      const colNum = colIdx + 1;
      const val    = row[id];
      if (val === undefined) return;
      const cell   = sheet.getRange(targetRow, colNum);

      if (id === "date") {
        cell.setValue(row.date); // siempre string YYYY-MM-DD
      } else if (val === null || val === "") {
        cell.clearContent();
      } else if (val === true) {
        cell.setValue(1);
      } else if (val === false) {
        cell.setValue(0);
      } else {
        cell.setValue(val);
      }
    });
  });

  // Ordenar por fecha (fila 3 en adelante, columna 1)
  const dataRows = sheet.getLastRow() - 2;
  if (dataRows > 1) {
    sheet.getRange(3, 1, dataRows, sheet.getLastColumn()).sort(1);
  }

  applyKpiFormatting(sheet);
}

function updateKpiLabels(ss, groups) {
  let sheet = ss.getSheetByName("KPIs");
  if (!sheet) return; // Si no existe aún, no hay nada que actualizar

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  const idRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  // Construir mapa id → label desde los grupos recibidos
  const labelMap = { date: "Fecha" };
  if (groups && Array.isArray(groups)) {
    groups.forEach(g => {
      if (g.fields && Array.isArray(g.fields)) {
        g.fields.forEach(f => {
          labelMap[f.id] = f.label || f.id;
        });
      }
    });
  }

  // Actualizar fila 2 con los labels actuales
  idRow.forEach((id, i) => {
    if (labelMap[id]) {
      sheet.getRange(2, i + 1).setValue(labelMap[id]);
    }
  });

  applyKpiFormatting(sheet);
}

function applyKpiFormatting(sheet) {
  // Fila 1 (IDs) — gris oscuro, texto pequeño
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const row1 = sheet.getRange(1, 1, 1, lastCol);
  row1.setFontSize(8)
      .setFontColor("#888888")
      .setBackground("#1a1a1a")
      .setFontWeight("normal")
      .setHorizontalAlignment("center");

  // Fila 2 (Labels) — cabecera principal
  const row2 = sheet.getRange(2, 1, 1, lastCol);
  row2.setFontSize(10)
      .setFontWeight("bold")
      .setFontColor("#FFFFFF")
      .setBackground("#1C1C2E")
      .setHorizontalAlignment("center")
      .setWrap(true);
  sheet.setRowHeight(2, 40);

  // Columna fecha — ancho fijo
  sheet.setColumnWidth(1, 110);

  // Datos — alternar color de filas desde fila 3
  const lastRow = sheet.getLastRow();
  if (lastRow >= 3) {
    for (let r = 3; r <= lastRow; r++) {
      const bg = r % 2 === 0 ? "#F7F7F7" : "#FFFFFF";
      sheet.getRange(r, 1, 1, lastCol).setBackground(bg).setFontSize(10);
    }
    // Colorear 1 = verde, 0 = rojo en columnas toggle (columnas 2 en adelante)
    if (lastCol > 1) {
      for (let r = 3; r <= lastRow; r++) {
        for (let c = 2; c <= lastCol; c++) {
          const cell = sheet.getRange(r, c);
          const val  = cell.getValue();
          if (val === 1)  { cell.setBackground("#E8F5E9").setFontColor("#2E7D32"); }
          else if (val === 0) { cell.setBackground(r%2===0?"#F7F7F7":"#FFFFFF").setFontColor("#888"); }
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HÁBITOS
// ══════════════════════════════════════════════════════════════════════════════

const HAB_HEADERS = ["ID", "Fecha", "Categoría", "Actividad", "Comentario", "Veces", "Duración (min)", "Distancia (km)"];
const HAB_FIELDS  = ["id", "date", "grupo", "habito", "comentario", "veces", "duracion", "distancia"];

function syncHabitos(ss, rows) {
  let sheet = ss.getSheetByName("Hábitos");
  if (!sheet) {
    sheet = ss.insertSheet("Hábitos");
    sheet.appendRow(HAB_HEADERS);
    const hRange = sheet.getRange(1, 1, 1, HAB_HEADERS.length);
    hRange.setFontWeight("bold")
          .setBackground("#1C2E1C")
          .setFontColor("#FFFFFF")
          .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    [80, 110, 150, 160, 200, 60, 110, 110].forEach((w, i) => sheet.setColumnWidth(i+1, w));
    sheet.hideColumns(1); // ocultar columna ID
  }

  const lastRow    = sheet.getLastRow();
  const existingIds = lastRow > 1
    ? sheet.getRange(2, 1, lastRow-1, 1).getValues().flat().map(String)
    : [];

  rows.forEach(row => {
    const rowData = HAB_FIELDS.map(f => row[f] !== undefined && row[f] !== null ? row[f] : "");
    const idx     = existingIds.indexOf(String(row.id));
    if (idx >= 0) {
      sheet.getRange(idx+2, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      existingIds.push(String(row.id));
    }
  });

  // Ordenar por fecha descendente
  if (sheet.getLastRow() > 2) {
    sheet.getRange(2, 1, sheet.getLastRow()-1, HAB_FIELDS.length).sort({ column:2, ascending:false });
  }

  // Alternar colores
  const lr = sheet.getLastRow();
  for (let r = 2; r <= lr; r++) {
    sheet.getRange(r, 1, 1, HAB_FIELDS.length).setBackground(r%2===0?"#F9FFF9":"#FFFFFF").setFontSize(10);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — volcado completo
// ══════════════════════════════════════════════════════════════════════════════

function syncConfig(ss, kpiGroups, habGroups, dayTypes) {
  // Guardar JSON raw para recuperación rápida al arrancar la app
  writeConfigRaw(ss, kpiGroups, habGroups, dayTypes);

  let sheet = ss.getSheetByName("Configuración");
  if (!sheet) {
    sheet = ss.insertSheet("Configuración");
  }
  sheet.clearContents();

  const now = new Date().toLocaleString("es-ES");
  let row = 1;

  // ── Cabecera ──
  sheet.getRange(row, 1, 1, 4).merge().setValue("CONFIGURACIÓN DE LA APP — Actualizado: " + now);
  sheet.getRange(row, 1).setFontWeight("bold").setBackground("#1C1C2E").setFontColor("#FFFFFF").setFontSize(11);
  sheet.setRowHeight(row, 28);
  row += 2;

  // ── KPI Groups ──
  sheet.getRange(row, 1, 1, 6).merge().setValue("GRUPOS KPI");
  sheet.getRange(row, 1).setFontWeight("bold").setBackground("#2E3A59").setFontColor("#FFFFFF");
  row++;

  const kpiHeaders = ["Grupo ID", "Grupo Label", "Emoji", "Color", "Campo ID", "Campo Label", "Tipo", "Positivo", "Máximo"];
  sheet.getRange(row, 1, 1, kpiHeaders.length).setValues([kpiHeaders]);
  sheet.getRange(row, 1, 1, kpiHeaders.length).setFontWeight("bold").setBackground("#3A4A6A").setFontColor("#FFFFFF");
  row++;

  if (kpiGroups && Array.isArray(kpiGroups)) {
    kpiGroups.forEach(g => {
      if (!g.fields || g.fields.length === 0) {
        sheet.getRange(row, 1, 1, kpiHeaders.length).setValues([[g.id, g.label, g.emoji, g.color, "—", "—", "—", "—", "—"]]);
        sheet.getRange(row, 4).setBackground(g.color || "#FFFFFF");
        row++;
      } else {
        g.fields.forEach((f, fi) => {
          const rowData = [
            fi === 0 ? g.id    : "",
            fi === 0 ? g.label : "",
            fi === 0 ? g.emoji : "",
            fi === 0 ? g.color : "",
            f.id,
            f.label,
            f.type,
            f.positive !== false ? "Positivo ✅" : "Negativo ⛔",
            f.max || "—",
          ];
          sheet.getRange(row, 1, 1, kpiHeaders.length).setValues([rowData]);
          if (fi === 0) sheet.getRange(row, 4).setBackground(g.color || "#FFFFFF");
          sheet.getRange(row, 8).setFontColor(f.positive !== false ? "#2E7D32" : "#C62828");
          row++;
        });
      }
    });
  }
  row++;

  // ── Hábitos Groups ──
  sheet.getRange(row, 1, 1, 4).merge().setValue("CATEGORÍAS DE HÁBITOS");
  sheet.getRange(row, 1).setFontWeight("bold").setBackground("#2E4A2E").setFontColor("#FFFFFF");
  row++;

  const habHeaders = ["Categoría ID", "Categoría Label", "Emoji", "Color", "Actividad"];
  sheet.getRange(row, 1, 1, habHeaders.length).setValues([habHeaders]);
  sheet.getRange(row, 1, 1, habHeaders.length).setFontWeight("bold").setBackground("#3A5A3A").setFontColor("#FFFFFF");
  row++;

  if (habGroups && Array.isArray(habGroups)) {
    habGroups.forEach(g => {
      const habList = g.habitos || [];
      const maxRows = Math.max(habList.length, 1);
      for (let i = 0; i < maxRows; i++) {
        const rowData = [
          i === 0 ? g.id    : "",
          i === 0 ? g.label : "",
          i === 0 ? g.emoji : "",
          i === 0 ? g.color : "",
          habList[i] || "—",
        ];
        sheet.getRange(row, 1, 1, habHeaders.length).setValues([rowData]);
        if (i === 0) sheet.getRange(row, 4).setBackground(g.color || "#FFFFFF");
        row++;
      }
    });
  }

  // ── Tipos de día ──
  if (dayTypes && Array.isArray(dayTypes) && dayTypes.length > 0) {
    row++;
    sheet.getRange(row, 1, 1, 4).merge().setValue("TIPOS DE DÍA");
    sheet.getRange(row, 1).setFontWeight("bold").setBackground("#1A2A3A").setFontColor("#FFFFFF");
    row++;

    const dtHeaders = ["Tipo ID", "Tipo Label", "Emoji", "Color"];
    sheet.getRange(row, 1, 1, dtHeaders.length).setValues([dtHeaders]);
    sheet.getRange(row, 1, 1, dtHeaders.length).setFontWeight("bold").setBackground("#2A3A4A").setFontColor("#FFFFFF");
    row++;

    dayTypes.forEach(t => {
      const rowData = [t.id||"", t.label||"", t.emoji||"", t.color||""];
      sheet.getRange(row, 1, 1, dtHeaders.length).setValues([rowData]);
      if (t.color) sheet.getRange(row, 4).setBackground(t.color);
      row++;
    });
  }

  // Formateo general
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 60);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 70);

  // Alternar filas de datos
  // (ya coloreadas por grupo, solo ajustamos fuente)
  sheet.getRange(1, 1, row, 9).setFontSize(10).setVerticalAlignment("middle");
}
