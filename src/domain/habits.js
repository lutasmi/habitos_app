/**
 * habits.js
 *
 * Utilidades de dominio para hábitos.
 */

import { HABIT_STATUS } from '../config/defaultConfig.js';

/**
 * Filtra hábitos activos y visibles.
 * @param {object[]} habits
 * @returns {object[]}
 */
export function getActiveHabits(habits) {
  return (habits || []).filter(
    h => (h.active === 'true' || h.active === true) &&
         (h.visible === 'true' || h.visible === true)
  );
}

/**
 * Agrupa hábitos por group_id.
 * @param {object[]} habits
 * @param {object[]} groups
 * @returns {object[]} Array de grupos con su lista de hábitos
 */
export function groupHabits(habits, groups) {
  const activeHabits = getActiveHabits(habits);
  const activeGroups = (groups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  return activeGroups.map(group => ({
    ...group,
    habits: activeHabits
      .filter(h => h.group_id === group.group_id)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
  }));
}

/**
 * Devuelve el valor registrado de un hábito para una fecha, o un valor vacío por defecto.
 * @param {string} habitId
 * @param {string} date
 * @param {object[]} habitValues - DAILY_HABIT_VALUES
 * @returns {object}
 */
export function getHabitValueForDate(habitId, date, habitValues) {
  const found = (habitValues || []).find(
    hv => hv.habit_id === habitId && hv.date === date
  );
  return found || {
    date,
    habit_id: habitId,
    value: '',
    status: HABIT_STATUS.EMPTY,
    score_value: 0,
    updated_at: '',
    updated_by: '',
  };
}

/**
 * Calcula el porcentaje de completitud de los hábitos de un día.
 * Sólo cuenta los hábitos con status done o not_done (excluye empty y not_applicable).
 *
 * @param {object[]} habits - Hábitos activos
 * @param {object[]} habitValues - Valores del día
 * @returns {number} Porcentaje 0–100
 */
export function dayCompletionPercent(habits, habitValues) {
  const active = getActiveHabits(habits);
  if (active.length === 0) return 0;

  const valueMap = {};
  (habitValues || []).forEach(hv => {
    valueMap[hv.habit_id] = hv;
  });

  const evaluated = active.filter(h => {
    const hv = valueMap[h.habit_id];
    return hv && (hv.status === HABIT_STATUS.DONE || hv.status === HABIT_STATUS.NOT_DONE);
  });

  const done = active.filter(h => {
    const hv = valueMap[h.habit_id];
    return hv && hv.status === HABIT_STATUS.DONE;
  });

  if (evaluated.length === 0) return 0;
  return Math.round((done.length / evaluated.length) * 100);
}
