/**
 * HabitInput.jsx
 *
 * Control de entrada para un único hábito.
 * Gestiona los 4 tipos: boolean, count, decimal, rating.
 *
 * Props:
 *   habit       — definición del hábito (CONFIG_HABITS)
 *   habitValue  — valor actual { value, status, score_value }
 *   onChange    — función(newHabitValue) llamada en cada cambio
 */

import { HABIT_TYPES, HABIT_STATUS, POSITIVE_RULES } from '../../config/defaultConfig.js';
import { calculateHabitScore } from '../../domain/scoring.js';

// ---- Helpers ----------------------------------------------------------------

function makeHabitValue(habit, value, status) {
  const draft = { habit_id: habit.habit_id, value: String(value), status };
  const score_value = calculateHabitScore(habit, draft);
  return { ...draft, score_value };
}

// ---- Boolean ----------------------------------------------------------------

function BooleanInput({ habit, habitValue, onChange }) {
  const isYesGood = habit.positive_rule !== POSITIVE_RULES.NO_IS_GOOD;
  const yesLabel = isYesGood ? '✓ Sí' : '✗ Sí';
  const noLabel  = isYesGood ? '✗ No' : '✓ No';

  const current = habitValue.status;

  function select(boolVal, status) {
    onChange(makeHabitValue(habit, boolVal ? 'true' : 'false', status));
  }

  return (
    <div className="habit-bool">
      <button
        className={`habit-bool-btn ${current === HABIT_STATUS.DONE ? 'habit-bool-btn--done' : ''}`}
        onClick={() =>
          current === HABIT_STATUS.DONE
            ? onChange(makeHabitValue(habit, '', HABIT_STATUS.EMPTY))
            : select(true, HABIT_STATUS.DONE)
        }
      >
        {yesLabel}
      </button>
      <button
        className={`habit-bool-btn habit-bool-btn--no ${current === HABIT_STATUS.NOT_DONE ? 'habit-bool-btn--not-done' : ''}`}
        onClick={() =>
          current === HABIT_STATUS.NOT_DONE
            ? onChange(makeHabitValue(habit, '', HABIT_STATUS.EMPTY))
            : select(false, HABIT_STATUS.NOT_DONE)
        }
      >
        {noLabel}
      </button>
    </div>
  );
}

// ---- Count ------------------------------------------------------------------

function CountInput({ habit, habitValue, onChange }) {
  const raw = habitValue.value === '' ? '' : habitValue.value;
  const num = raw === '' ? 0 : parseInt(raw, 10) || 0;
  const target = parseInt(habit.target_value, 10) || null;

  function update(newVal) {
    const clamped = Math.max(0, newVal);
    const rule = habit.positive_rule;
    let status;
    if (clamped === 0) {
      status = HABIT_STATUS.EMPTY;
    } else if (rule === POSITIVE_RULES.GREATER_EQUAL_TARGET) {
      status = target !== null && clamped >= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
    } else if (rule === POSITIVE_RULES.LOWER_EQUAL_TARGET) {
      status = target !== null && clamped <= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
    } else {
      status = clamped > 0 ? HABIT_STATUS.DONE : HABIT_STATUS.EMPTY;
    }
    onChange(makeHabitValue(habit, clamped, status));
  }

  return (
    <div className="habit-count">
      <button className="habit-count-btn" onClick={() => update(num - 1)} aria-label="Restar">−</button>
      <input
        className="habit-count-input"
        type="number"
        inputMode="numeric"
        min="0"
        value={raw === '' ? 0 : num}
        onChange={e => update(parseInt(e.target.value, 10) || 0)}
      />
      <button className="habit-count-btn" onClick={() => update(num + 1)} aria-label="Sumar">+</button>
      {target !== null && (
        <span className="habit-count-target text-muted">/ {target} {habit.unit || ''}</span>
      )}
    </div>
  );
}

// ---- Decimal ----------------------------------------------------------------

function DecimalInput({ habit, habitValue, onChange }) {
  const raw = habitValue.value;
  const target = parseFloat(habit.target_value) || null;

  function update(strVal) {
    const num = parseFloat(strVal);
    let status = HABIT_STATUS.EMPTY;
    if (strVal !== '' && !isNaN(num)) {
      const rule = habit.positive_rule;
      if (rule === POSITIVE_RULES.GREATER_EQUAL_TARGET) {
        status = target !== null && num >= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
      } else if (rule === POSITIVE_RULES.LOWER_EQUAL_TARGET) {
        status = target !== null && num <= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
      } else {
        status = num > 0 ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
      }
    }
    onChange(makeHabitValue(habit, strVal, status));
  }

  return (
    <div className="habit-decimal">
      <input
        className="habit-decimal-input"
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={raw}
        placeholder="0"
        onChange={e => update(e.target.value)}
      />
      {habit.unit && <span className="text-muted" style={{ fontSize: 13 }}>{habit.unit}</span>}
      {target !== null && (
        <span className="text-muted" style={{ fontSize: 12 }}>meta: {target}</span>
      )}
    </div>
  );
}

// ---- Rating -----------------------------------------------------------------

function RatingInput({ habit, habitValue, onChange }) {
  const max = parseInt(habit.target_value, 10) || 5;
  const current = parseInt(habitValue.value, 10) || 0;

  function select(val) {
    const isSame = current === val;
    const newVal = isSame ? 0 : val;
    const status = newVal === 0 ? HABIT_STATUS.EMPTY : HABIT_STATUS.DONE;
    onChange(makeHabitValue(habit, newVal, status));
  }

  return (
    <div className="habit-rating">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          className={`habit-rating-btn ${n <= current ? 'habit-rating-btn--active' : ''}`}
          onClick={() => select(n)}
          aria-label={`${n} de ${max}`}
        >
          {n <= current ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

// ---- Main export ------------------------------------------------------------

export function HabitInput({ habit, habitValue, onChange }) {
  const type = habit.type;

  return (
    <div className="habit-row">
      <div className="habit-row__info">
        <span className="habit-row__name">{habit.name}</span>
        {habit.description && (
          <span className="habit-row__desc text-muted">{habit.description}</span>
        )}
      </div>
      <div className="habit-row__control">
        {type === HABIT_TYPES.BOOLEAN && (
          <BooleanInput habit={habit} habitValue={habitValue} onChange={onChange} />
        )}
        {type === HABIT_TYPES.COUNT && (
          <CountInput habit={habit} habitValue={habitValue} onChange={onChange} />
        )}
        {type === HABIT_TYPES.DECIMAL && (
          <DecimalInput habit={habit} habitValue={habitValue} onChange={onChange} />
        )}
        {type === HABIT_TYPES.RATING && (
          <RatingInput habit={habit} habitValue={habitValue} onChange={onChange} />
        )}
        {!Object.values(HABIT_TYPES).includes(type) && (
          <span className="text-muted" style={{ fontSize: 12 }}>Tipo desconocido: {type}</span>
        )}
      </div>
    </div>
  );
}
