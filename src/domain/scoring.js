/**
 * scoring.js
 *
 * Lógica de cálculo del score. Solo aritmética y lógica pura.
 * Sin dependencias de UI ni de red.
 *
 * SEPARACIÓN DE RESPONSABILIDADES
 * ────────────────────────────────
 * CONFIG_HABITS   → determina el score numérico de cada hábito
 * CONFIG_SCORE    → transforma un score ya calculado en color/etiqueta (solo visual)
 *
 * CONTRATO DE score_min / score_max
 * ──────────────────────────────────
 * Ambos son valores exactos que pueden ser 0, positivos o negativos.
 * Un score_max = 0 es válido (el hábito puntúa 0 si se cumple).
 * Un score_min = 0 es válido (el hábito no penaliza si no se cumple).
 * No se aplica ningún fallback cuando el valor parseado es 0.
 */

import { HABIT_TYPES, POSITIVE_RULES, HABIT_STATUS } from '../config/defaultConfig.js';

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Parsea un valor numérico de celda de Sheets (llega como string).
 * Devuelve el número o null si está vacío/ausente.
 * No usa `|| fallback` para no romper el valor legítimo 0.
 *
 * @param {string|number|null|undefined} val
 * @returns {number|null}
 */
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/**
 * Determina si el valor registrado cumple la condición positiva del hábito.
 * Solo evalúa lógica; no sabe nada de scores ni pesos.
 *
 * Reglas por tipo:
 *   boolean → yes_is_good: marcar=positivo / no_is_good: marcar=negativo
 *   count   → greater_equal_target | lower_equal_target comparado con target_value
 *   decimal → ídem que count
 *   rating  → ídem que count (el valor numérico seleccionado vs target_value)
 *
 * @param {object} habit       Fila de CONFIG_HABITS
 * @param {object} habitValue  Fila de DAILY_HABIT_VALUES
 * @returns {boolean}
 */
export function evaluatePositiveRule(habit, habitValue) {
  const rule     = habit.positive_rule;
  const rawValue = habitValue.value;
  const type     = habit.type;

  // ── Boolean ────────────────────────────────────────────────────────────────
  if (type === HABIT_TYPES.BOOLEAN) {
    const isTrue = rawValue === 'true' || rawValue === '1' || rawValue === 'yes';
    if (rule === POSITIVE_RULES.YES_IS_GOOD) return isTrue;
    if (rule === POSITIVE_RULES.NO_IS_GOOD)  return !isTrue;
    // Fallback seguro: si no hay regla válida, tratar marca como positivo
    return isTrue;
  }

  // ── Count / Decimal / Rating ───────────────────────────────────────────────
  // Los tres tipos numéricos comparten la misma lógica de comparación.
  // Rating: el número seleccionado (1–N) se compara contra target_value.
  const numValue = parseNum(rawValue);
  if (numValue === null) return false; // sin valor registrado → no positivo

  const target = parseNum(habit.target_value);

  if (rule === POSITIVE_RULES.GREATER_EQUAL_TARGET) {
    return target !== null && numValue >= target;
  }
  if (rule === POSITIVE_RULES.LOWER_EQUAL_TARGET) {
    return target !== null && numValue <= target;
  }

  // yes_is_good / no_is_good no tienen semántica para tipos numéricos.
  // Se considera no cumplido para no asignar score silenciosamente.
  return false;
}

/**
 * Calcula el score aportado por un único hábito en un registro dado.
 *
 * Salidas posibles:
 *   status = empty / not_applicable → 0 (sin dato)
 *   score_weight = 0                → 0 (hábito excluido del score)
 *   cumple  → score_max  (puede ser 0, positivo o negativo)
 *   no cumple → score_min (puede ser 0, positivo o negativo)
 *
 * IMPORTANTE: score_min y score_max se leen con parseNum, no con `|| fallback`.
 * Esto garantiza que score_max=0 se respeta como "aporta 0 al cumplir"
 * y no se sustituye silenciosamente por otro valor.
 *
 * @param {object} habit       Fila de CONFIG_HABITS
 * @param {object} habitValue  Fila de DAILY_HABIT_VALUES
 * @returns {number}
 */
export function calculateHabitScore(habit, habitValue) {
  if (!habit || !habitValue) return 0;

  // Sin dato registrado → no puntúa
  if (habitValue.status === HABIT_STATUS.EMPTY)          return 0;
  if (habitValue.status === HABIT_STATUS.NOT_APPLICABLE) return 0;

  // Hábito con peso cero → excluido del score intencionalmente
  const weight = parseNum(habit.score_weight);
  if (weight === null || weight === 0) return 0;

  // score_min y score_max son valores exactos.
  // Si están vacíos en Sheets, el fallback es 0 (sin penalización / sin bonus).
  // score_max: si está informado, usar ese valor exacto (incluyendo 0).
  //            si está vacío en Sheets, usar score_weight como fallback.
  // score_min: si está informado, usar ese valor exacto (incluyendo 0).
  //            si está vacío en Sheets, usar 0 (sin penalización por defecto).
  const scoreMin = parseNum(habit.score_min) ?? 0;
  const scoreMax = parseNum(habit.score_max) ?? weight;

  const isPositive = evaluatePositiveRule(habit, habitValue);
  return isPositive ? scoreMax : scoreMin;
}

/**
 * Calcula el score total del día sumando las aportaciones de todos los
 * hábitos activos. Los hábitos sin registro ese día aportan 0.
 *
 * @param {object[]} habits       Hábitos activos (CONFIG_HABITS)
 * @param {object[]} habitValues  Valores del día (DAILY_HABIT_VALUES)
 * @returns {number}
 */
export function calculateDayScore(habits, habitValues) {
  if (!habits || habits.length === 0) return 0;

  const valuesByHabitId = {};
  (habitValues || []).forEach(hv => { valuesByHabitId[hv.habit_id] = hv; });

  return habits.reduce((total, habit) => {
    // Solo hábitos activos contribuyen al score del día
    if (habit.active !== 'true' && habit.active !== true) return total;
    const hv = valuesByHabitId[habit.habit_id];
    return total + (hv ? calculateHabitScore(habit, hv) : 0);
  }, 0);
}

/**
 * Calcula el score medio de un periodo dado un array de scores diarios.
 *
 * @param {number[]} dayScores
 * @returns {number}
 */
export function calculatePeriodScore(dayScores) {
  if (!dayScores || dayScores.length === 0) return 0;
  const sum = dayScores.reduce((a, b) => a + b, 0);
  return Math.round((sum / dayScores.length) * 10) / 10;
}

/**
 * Busca la regla de CONFIG_SCORE que corresponde a un score y scope dados.
 *
 * CONFIG_SCORE solo afecta la visualización (color, etiqueta).
 * No entra en ningún cálculo numérico.
 *
 * Orden de aplicación: sort_order ascendente.
 * Si dos reglas se solapan, gana la de menor sort_order (primera en Sheets).
 * Rango: [min_value, max_value) — mínimo inclusive, máximo exclusive.
 *
 * @param {number}   value       Score a colorear
 * @param {string}   scope       'day' | 'week' | 'month'
 * @param {object[]} scoreRules  Filas de CONFIG_SCORE
 * @returns {object|null}        La regla que aplica, o null si ninguna encaja
 */
export function findScoreRule(value, scope, scoreRules) {
  if (!scoreRules || !scoreRules.length) return null;

  return (
    scoreRules
      // Solo reglas activas del scope solicitado
      .filter(r =>
        r.scope === scope &&
        (r.active === 'true' || r.active === true)
      )
      // Ordenar por sort_order ascendente antes de buscar
      // Si sort_order está vacío, va al final (Infinity)
      .sort((a, b) => {
        const sa = parseNum(a.sort_order) ?? Infinity;
        const sb = parseNum(b.sort_order) ?? Infinity;
        return sa - sb;
      })
      .find(r => {
        const min = parseNum(r.min_value);
        const max = parseNum(r.max_value);
        // Ambos extremos deben ser números válidos para aplicar la regla
        if (min === null || max === null) return false;
        return value >= min && value < max;
      }) ?? null
  );
}
