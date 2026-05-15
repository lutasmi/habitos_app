/**
 * scoring.js
 *
 * Lógica de cálculo del score.
 * Debe poder replicarse en Google Sheets con fórmulas.
 * El score es MOTIVACIONAL, no analítico crítico.
 * Puede ser negativo.
 */

import { HABIT_TYPES, POSITIVE_RULES, HABIT_STATUS } from '../config/defaultConfig.js';

/**
 * Calcula el score aportado por un único hábito en un día dado.
 *
 * @param {object} habit - Definición del hábito (de CONFIG_HABITS)
 * @param {object} habitValue - Valor registrado (de DAILY_HABIT_VALUES)
 * @returns {number} Score aportado por este hábito
 */
export function calculateHabitScore(habit, habitValue) {
  if (!habit || !habitValue) return 0;
  if (habitValue.status === HABIT_STATUS.NOT_APPLICABLE) return 0;
  if (habitValue.status === HABIT_STATUS.EMPTY) return 0;

  const weight = parseFloat(habit.score_weight) || 0;
  if (weight === 0) return 0;

  const scoreMin = parseFloat(habit.score_min) || 0;
  const scoreMax = parseFloat(habit.score_max) || weight;

  const isPositive = evaluatePositiveRule(habit, habitValue);

  // Si el resultado es positivo, aporta score_max. Si no, score_min.
  return isPositive ? scoreMax : scoreMin;
}

/**
 * Evalúa si el valor registrado cumple la regla positiva del hábito.
 *
 * @param {object} habit
 * @param {object} habitValue
 * @returns {boolean}
 */
export function evaluatePositiveRule(habit, habitValue) {
  const rule = habit.positive_rule;
  const rawValue = habitValue.value;
  const type = habit.type;
  const target = parseFloat(habit.target_value);

  if (type === HABIT_TYPES.BOOLEAN) {
    const isTrue = rawValue === 'true' || rawValue === '1' || rawValue === 'yes';
    if (rule === POSITIVE_RULES.YES_IS_GOOD) return isTrue;
    if (rule === POSITIVE_RULES.NO_IS_GOOD) return !isTrue;
    return isTrue;
  }

  const numValue = parseFloat(rawValue);
  if (isNaN(numValue)) return false;

  if (rule === POSITIVE_RULES.GREATER_EQUAL_TARGET) return numValue >= target;
  if (rule === POSITIVE_RULES.LOWER_EQUAL_TARGET) return numValue <= target;

  return false;
}

/**
 * Calcula el score total de un día.
 *
 * @param {object[]} habits - Lista de hábitos activos
 * @param {object[]} habitValues - Lista de valores del día (DAILY_HABIT_VALUES)
 * @returns {number} Score total del día
 */
export function calculateDayScore(habits, habitValues) {
  if (!habits || habits.length === 0) return 0;

  const valuesByHabitId = {};
  (habitValues || []).forEach(hv => {
    valuesByHabitId[hv.habit_id] = hv;
  });

  return habits.reduce((total, habit) => {
    if (habit.active !== 'true' && habit.active !== true) return total;
    const hv = valuesByHabitId[habit.habit_id];
    const score = hv ? calculateHabitScore(habit, hv) : 0;
    return total + score;
  }, 0);
}

/**
 * Calcula el score de un periodo (semana, mes) dado un array de scores diarios.
 *
 * @param {number[]} dayScores - Array de scores diarios del periodo
 * @returns {number} Score del periodo (media simple)
 */
export function calculatePeriodScore(dayScores) {
  if (!dayScores || dayScores.length === 0) return 0;
  const sum = dayScores.reduce((a, b) => a + b, 0);
  return Math.round((sum / dayScores.length) * 10) / 10;
}

/**
 * Busca la regla de score que corresponde a un valor dado y scope.
 *
 * @param {number} value - Valor del score
 * @param {string} scope - 'day' | 'week' | 'month'
 * @param {object[]} scoreRules - Reglas de CONFIG_SCORE
 * @returns {object|null} La regla que aplica, o null si no se encuentra
 */
export function findScoreRule(value, scope, scoreRules) {
  if (!scoreRules) return null;
  return (
    scoreRules
      .filter(r => r.scope === scope && (r.active === 'true' || r.active === true))
      .find(r => {
        const min = parseFloat(r.min_value);
        const max = parseFloat(r.max_value);
        return value >= min && value < max;
      }) || null
  );
}
