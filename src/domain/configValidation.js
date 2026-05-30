/**
 * configValidation.js
 *
 * Validación de configuración cargada desde Google Sheets.
 * Lógica pura: sin dependencias de UI ni de red.
 *
 * Cada validación devuelve objetos con esta forma:
 * {
 *   severity: 'error' | 'warning',
 *   code:     string,      // identificador único de la regla
 *   message:  string,      // texto legible para el usuario
 *   sheet:    string,      // nombre de la hoja de Sheets
 *   entityId: string,      // ID del registro problemático
 * }
 *
 * SEVERIDADES
 *   error   → problema que puede romper el comportamiento de la app
 *   warning → problema que no rompe pero puede producir resultados inesperados
 */

// ── Tipos y reglas válidas ────────────────────────────────────────────────────

const VALID_HABIT_TYPES = new Set(['boolean', 'count', 'decimal', 'rating']);

const VALID_POSITIVE_RULES = new Set([
  'yes_is_good',
  'no_is_good',
  'greater_equal_target',
  'lower_equal_target',
]);

const BOOLEAN_RULES    = new Set(['yes_is_good', 'no_is_good']);
const NUMERIC_RULES    = new Set(['greater_equal_target', 'lower_equal_target']);
const NUMERIC_TYPES    = new Set(['count', 'decimal', 'rating']);

const VALID_PERIODS    = new Set(['week', 'month', 'quarter', 'year']);

// ── Helpers internos ──────────────────────────────────────────────────────────

function isNum(val) {
  if (val === null || val === undefined || String(val).trim() === '') return false;
  return !isNaN(parseFloat(val));
}

function isTrue(val) {
  return val === true || val === 'true';
}

function hasValue(val) {
  return val !== null && val !== undefined && String(val).trim() !== '';
}

function issue(severity, code, message, sheet, entityId) {
  return { severity, code, message, sheet, entityId: String(entityId || '') };
}

// ── CONFIG_HABIT_GROUPS ───────────────────────────────────────────────────────

function validateHabitGroups(groups) {
  const results = [];
  const seenIds = new Set();

  (groups || []).forEach(g => {
    const id = String(g.group_id || '').trim();

    if (!id) {
      results.push(issue('error', 'HG_MISSING_ID',
        'Grupo de hábito sin group_id.',
        'CONFIG_HABIT_GROUPS', id || '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'HG_DUPLICATE_ID',
        `group_id duplicado: "${id}".`,
        'CONFIG_HABIT_GROUPS', id));
    }
    seenIds.add(id);

    if (!hasValue(g.name)) {
      results.push(issue('error', 'HG_MISSING_NAME',
        `Grupo "${id}" no tiene name.`,
        'CONFIG_HABIT_GROUPS', id));
    }

    if (hasValue(g.sort_order) && !isNum(g.sort_order)) {
      results.push(issue('warning', 'HG_INVALID_SORT_ORDER',
        `Grupo "${id}": sort_order "${g.sort_order}" no es numérico.`,
        'CONFIG_HABIT_GROUPS', id));
    }
  });

  return results;
}

// ── CONFIG_HABITS ─────────────────────────────────────────────────────────────

function validateHabits(habits, groups) {
  const results  = [];
  const seenIds  = new Set();
  const groupIds = new Set((groups || []).map(g => String(g.group_id || '').trim()));

  (habits || []).forEach(h => {
    const id = String(h.habit_id || '').trim();

    if (!id) {
      results.push(issue('error', 'H_MISSING_ID',
        'Hábito sin habit_id.',
        'CONFIG_HABITS', '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'H_DUPLICATE_ID',
        `habit_id duplicado: "${id}".`,
        'CONFIG_HABITS', id));
    }
    seenIds.add(id);

    const gid = String(h.group_id || '').trim();
    if (!gid || !groupIds.has(gid)) {
      results.push(issue('error', 'H_INVALID_GROUP',
        `Hábito "${id}": group_id "${gid}" no existe en CONFIG_HABIT_GROUPS.`,
        'CONFIG_HABITS', id));
    }

    const type = String(h.type || '').trim();
    if (!VALID_HABIT_TYPES.has(type)) {
      results.push(issue('error', 'H_INVALID_TYPE',
        `Hábito "${id}": type "${type}" no válido. Debe ser boolean, count, decimal o rating.`,
        'CONFIG_HABITS', id));
    }

    const rule = String(h.positive_rule || '').trim();
    if (!VALID_POSITIVE_RULES.has(rule)) {
      results.push(issue('error', 'H_INVALID_RULE',
        `Hábito "${id}": positive_rule "${rule}" no válido.`,
        'CONFIG_HABITS', id));
    } else {
      // Combinaciones type/rule sospechosas → warning
      if (type === 'boolean' && NUMERIC_RULES.has(rule)) {
        results.push(issue('warning', 'H_RULE_TYPE_MISMATCH',
          `Hábito "${id}": type boolean con positive_rule numérica ("${rule}"). Usa yes_is_good o no_is_good.`,
          'CONFIG_HABITS', id));
      }
      if (NUMERIC_TYPES.has(type) && BOOLEAN_RULES.has(rule)) {
        results.push(issue('warning', 'H_RULE_TYPE_MISMATCH',
          `Hábito "${id}": type ${type} con positive_rule booleana ("${rule}"). El hábito nunca puntuará. Usa greater_equal_target o lower_equal_target.`,
          'CONFIG_HABITS', id));
      }
    }

    // target_value recomendado para tipos numéricos
    if (NUMERIC_TYPES.has(type) && !isNum(h.target_value)) {
      results.push(issue('warning', 'H_MISSING_TARGET',
        `Hábito "${id}": type ${type} sin target_value numérico. La comparación de cumplimiento fallará.`,
        'CONFIG_HABITS', id));
    }

    if (hasValue(h.score_weight) && !isNum(h.score_weight)) {
      results.push(issue('error', 'H_INVALID_WEIGHT',
        `Hábito "${id}": score_weight "${h.score_weight}" no es numérico.`,
        'CONFIG_HABITS', id));
    }

    if (hasValue(h.score_min) && !isNum(h.score_min)) {
      results.push(issue('error', 'H_INVALID_SCORE_MIN',
        `Hábito "${id}": score_min "${h.score_min}" no es numérico.`,
        'CONFIG_HABITS', id));
    }

    if (hasValue(h.score_max) && !isNum(h.score_max)) {
      results.push(issue('error', 'H_INVALID_SCORE_MAX',
        `Hábito "${id}": score_max "${h.score_max}" no es numérico.`,
        'CONFIG_HABITS', id));
    }
  });

  return results;
}

// ── CONFIG_ACTIVITY_GROUPS ────────────────────────────────────────────────────

function validateActivityGroups(groups) {
  const results = [];
  const seenIds = new Set();

  (groups || []).forEach(g => {
    const id = String(g.group_id || '').trim();

    if (!id) {
      results.push(issue('error', 'AG_MISSING_ID',
        'Grupo de actividad sin group_id.',
        'CONFIG_ACTIVITY_GROUPS', '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'AG_DUPLICATE_ID',
        `group_id duplicado: "${id}".`,
        'CONFIG_ACTIVITY_GROUPS', id));
    }
    seenIds.add(id);

    if (!hasValue(g.name)) {
      results.push(issue('error', 'AG_MISSING_NAME',
        `Grupo de actividad "${id}" no tiene name.`,
        'CONFIG_ACTIVITY_GROUPS', id));
    }
  });

  return results;
}

// ── CONFIG_ACTIVITIES ─────────────────────────────────────────────────────────

function validateActivities(activities, activityGroups) {
  const results  = [];
  const seenIds  = new Set();
  const groupIds = new Set((activityGroups || []).map(g => String(g.group_id || '').trim()));

  (activities || []).forEach(a => {
    const id = String(a.activity_id || '').trim();

    if (!id) {
      results.push(issue('error', 'A_MISSING_ID',
        'Actividad sin activity_id.',
        'CONFIG_ACTIVITIES', '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'A_DUPLICATE_ID',
        `activity_id duplicado: "${id}".`,
        'CONFIG_ACTIVITIES', id));
    }
    seenIds.add(id);

    const gid = String(a.group_id || '').trim();
    if (!gid || !groupIds.has(gid)) {
      results.push(issue('error', 'A_INVALID_GROUP',
        `Actividad "${id}": group_id "${gid}" no existe en CONFIG_ACTIVITY_GROUPS.`,
        'CONFIG_ACTIVITIES', id));
    }

    if (hasValue(a.target_value) && !isNum(a.target_value)) {
      results.push(issue('error', 'A_INVALID_TARGET',
        `Actividad "${id}": target_value "${a.target_value}" no es numérico.`,
        'CONFIG_ACTIVITIES', id));
    }

    const period = String(a.target_period || '').trim();
    if (hasValue(period) && !VALID_PERIODS.has(period)) {
      results.push(issue('warning', 'A_INVALID_PERIOD',
        `Actividad "${id}": target_period "${period}" no reconocido. Usa week, month, quarter o year.`,
        'CONFIG_ACTIVITIES', id));
    }

    // Inconsistencias entre target_unit y requires_*
    const unit = String(a.target_unit || '').trim().toLowerCase();
    if (unit === 'min' && !isTrue(a.requires_duration)) {
      results.push(issue('warning', 'A_UNIT_DURATION_MISMATCH',
        `Actividad "${id}": target_unit es "min" pero requires_duration es false. La duración no se registrará.`,
        'CONFIG_ACTIVITIES', id));
    }
    if (unit === 'km' && !isTrue(a.requires_distance)) {
      results.push(issue('warning', 'A_UNIT_DISTANCE_MISMATCH',
        `Actividad "${id}": target_unit es "km" pero requires_distance es false. La distancia no se registrará.`,
        'CONFIG_ACTIVITIES', id));
    }
  });

  return results;
}

// ── CONFIG_DAY_TYPES ──────────────────────────────────────────────────────────

function validateDayTypes(dayTypes) {
  const results = [];
  const seenIds = new Set();

  (dayTypes || []).forEach(dt => {
    const id = String(dt.day_type_id || '').trim();

    if (!id) {
      results.push(issue('error', 'DT_MISSING_ID',
        'Tipo de día sin day_type_id.',
        'CONFIG_DAY_TYPES', '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'DT_DUPLICATE_ID',
        `day_type_id duplicado: "${id}".`,
        'CONFIG_DAY_TYPES', id));
    }
    seenIds.add(id);

    if (!hasValue(dt.name)) {
      results.push(issue('error', 'DT_MISSING_NAME',
        `Tipo de día "${id}" no tiene name.`,
        'CONFIG_DAY_TYPES', id));
    }
  });

  return results;
}

// ── CONFIG_SCORE ──────────────────────────────────────────────────────────────

function validateScoreRules(scoreRules) {
  const results = [];
  const seenIds = new Set();

  // Agrupamos por scope para detectar solapamientos dentro de cada uno
  const byScope = {};

  (scoreRules || []).forEach(r => {
    const id = String(r.rule_id || '').trim();

    if (!id) {
      results.push(issue('error', 'SR_MISSING_ID',
        'Regla de score sin rule_id.',
        'CONFIG_SCORE', '(vacío)'));
      return;
    }

    if (seenIds.has(id)) {
      results.push(issue('error', 'SR_DUPLICATE_ID',
        `rule_id duplicado: "${id}".`,
        'CONFIG_SCORE', id));
    }
    seenIds.add(id);

    if (!isNum(r.min_value)) {
      results.push(issue('error', 'SR_INVALID_MIN',
        `Regla "${id}": min_value "${r.min_value}" no es numérico.`,
        'CONFIG_SCORE', id));
    }

    if (!isNum(r.max_value)) {
      results.push(issue('error', 'SR_INVALID_MAX',
        `Regla "${id}": max_value "${r.max_value}" no es numérico.`,
        'CONFIG_SCORE', id));
    }

    if (isNum(r.min_value) && isNum(r.max_value)) {
      if (parseFloat(r.min_value) >= parseFloat(r.max_value)) {
        results.push(issue('error', 'SR_INVALID_RANGE',
          `Regla "${id}": min_value (${r.min_value}) debe ser menor que max_value (${r.max_value}).`,
          'CONFIG_SCORE', id));
      }
    }

    const isActive = isTrue(r.active);
    if (isActive && !hasValue(r.color)) {
      results.push(issue('warning', 'SR_MISSING_COLOR',
        `Regla "${id}" está activa pero no tiene color. El heatmap usará el fallback.`,
        'CONFIG_SCORE', id));
    }

    if (hasValue(r.sort_order) && !isNum(r.sort_order)) {
      results.push(issue('warning', 'SR_INVALID_SORT_ORDER',
        `Regla "${id}": sort_order "${r.sort_order}" no es numérico.`,
        'CONFIG_SCORE', id));
    }

    // Acumular rangos válidos para detección de solapamientos
    const scope = String(r.scope || '').trim();
    if (scope && isNum(r.min_value) && isNum(r.max_value) && isActive) {
      if (!byScope[scope]) byScope[scope] = [];
      byScope[scope].push({
        id,
        min: parseFloat(r.min_value),
        max: parseFloat(r.max_value),
      });
    }
  });

  // Detectar solapamientos dentro de cada scope
  Object.entries(byScope).forEach(([scope, ranges]) => {
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const a = ranges[i];
        const b = ranges[j];
        // Se solapan si max de uno > min del otro y min de uno < max del otro
        const overlaps = a.min < b.max && b.min < a.max;
        if (overlaps) {
          results.push(issue('warning', 'SR_OVERLAPPING_RANGES',
            `Rangos solapados en scope "${scope}": "${a.id}" [${a.min}, ${a.max}) y "${b.id}" [${b.min}, ${b.max}). Ganará el de menor sort_order.`,
            'CONFIG_SCORE', `${a.id}+${b.id}`));
        }
      }
    }
  });

  return results;
}

// ── Punto de entrada público ──────────────────────────────────────────────────

/**
 * Valida la configuración completa cargada desde Google Sheets.
 *
 * @param {object} config  Objeto config de AppShell
 *   { habitGroups, habits, activityGroups, activities, dayTypes, scoreRules }
 * @returns {object}
 *   { issues: Issue[], errorCount: number, warningCount: number }
 */
export function validateConfig(config) {
  if (!config) {
    return { issues: [], errorCount: 0, warningCount: 0 };
  }

  const issues = [
    ...validateHabitGroups(config.habitGroups),
    ...validateHabits(config.habits, config.habitGroups),
    ...validateActivityGroups(config.activityGroups),
    ...validateActivities(config.activities, config.activityGroups),
    ...validateDayTypes(config.dayTypes),
    ...validateScoreRules(config.scoreRules),
  ];

  const errorCount   = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return { issues, errorCount, warningCount };
}

/**
 * Agrupa los issues por hoja para mostrarlos en la UI.
 *
 * @param {Issue[]} issues
 * @returns {object}  { [sheetName]: Issue[] }
 */
export function groupIssuesBySheet(issues) {
  const grouped = {};
  (issues || []).forEach(issue => {
    if (!grouped[issue.sheet]) grouped[issue.sheet] = [];
    grouped[issue.sheet].push(issue);
  });
  return grouped;
}
