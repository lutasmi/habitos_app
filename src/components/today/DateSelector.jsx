/**
 * DateSelector.jsx
 *
 * Selector de fecha con botones anterior/siguiente.
 *
 * Lógica de "hoy":
 * - Comparación siempre entre strings YYYY-MM-DD (nunca objetos Date).
 * - Si la fecha seleccionada ES hoy → etiqueta visual estática "Hoy".
 * - Si la fecha seleccionada NO es hoy → botón de acción "Ir a hoy".
 *
 * Separación de conceptos:
 *   "Hoy"      = etiqueta informativa (no es pulsable)
 *   "Ir a hoy" = acción que navega a la fecha actual
 */

import { addDays, parseDate, getTodayDateKey, normalizeDateKey, weekDayName } from '../../domain/dates.js';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDisplay(dateString) {
  const d   = parseDate(dateString);
  const day = weekDayName(dateString);
  const num = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  return `${day} ${num} de ${month}`;
}

/**
 * @param {object}   props
 * @param {string}   props.date      Fecha seleccionada como string 'YYYY-MM-DD'
 * @param {function} props.onChange  Callback(newDateString) al cambiar la fecha
 */
export function DateSelector({ date, onChange }) {
  // Comparación siempre entre strings normalizados — nunca objetos Date
  const today    = getTodayDateKey();
  const selected = normalizeDateKey(date);
  const isToday  = selected === today;

  // El botón › se deshabilita cuando la fecha seleccionada ya es hoy
  const isNextDisabled = isToday;

  return (
    <div className="date-selector">
      <button
        type="button"
        className="date-nav-btn"
        onClick={() => onChange(addDays(selected, -1))}
        aria-label="Día anterior"
      >
        ‹
      </button>

      <div className="date-display">
        <span className="date-label">{formatDisplay(selected)}</span>

        {isToday ? (
          // Etiqueta informativa — no es un botón
          <span className="today-badge" aria-label="Fecha actual">Hoy</span>
        ) : (
          // Botón de acción — navega a la fecha actual
          <button
            type="button"
            className="today-button"
            onClick={() => onChange(today)}
            aria-label="Ir a hoy"
          >
            Ir a hoy
          </button>
        )}
      </div>

      <button
        type="button"
        className="date-nav-btn"
        onClick={() => onChange(addDays(selected, 1))}
        disabled={isNextDisabled}
        aria-label="Día siguiente"
      >
        ›
      </button>
    </div>
  );
}
