/**
 * DateSelector.jsx
 *
 * Selector de fecha con botones anterior/siguiente.
 * Todas las fechas son strings 'YYYY-MM-DD'.
 */

import { addDays, todayString, weekDayName, parseDate } from '../../domain/dates.js';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDisplay(dateString) {
  const d = parseDate(dateString);
  const day = weekDayName(dateString);
  const num = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const isToday = dateString === todayString();
  return isToday ? `Hoy, ${num} de ${month}` : `${day} ${num} de ${month}`;
}

export function DateSelector({ date, onChange }) {
  const isToday = date === todayString();

  return (
    <div className="date-selector">
      <button
        className="date-nav-btn"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Día anterior"
      >
        ‹
      </button>

      <div className="date-display">
        <span className="date-label">{formatDisplay(date)}</span>
        {!isToday && (
          <button
            className="date-today-btn"
            onClick={() => onChange(todayString())}
          >
            Hoy
          </button>
        )}
      </div>

      <button
        className="date-nav-btn"
        onClick={() => onChange(addDays(date, 1))}
        disabled={isToday}
        aria-label="Día siguiente"
      >
        ›
      </button>
    </div>
  );
}
