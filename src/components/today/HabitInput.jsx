import { HABIT_TYPES, HABIT_STATUS, POSITIVE_RULES } from '../../config/defaultConfig.js';
import { calculateHabitScore } from '../../domain/scoring.js';

function makeHabitValue(habit, value, status) {
  const draft = { habit_id: habit.habit_id, value: String(value), status };
  return { ...draft, score_value: calculateHabitScore(habit, draft) };
}

/**
 * Evalúa si marcar/no marcar un boolean es positivo según positive_rule.
 * Fuente única de verdad para status Y color visual.
 *
 * @param {boolean} markedTrue  — true si el usuario marca "Sí"
 * @param {string}  rule        — positive_rule del hábito
 * @returns {HABIT_STATUS}      — DONE si es positivo, NOT_DONE si es negativo
 */
function booleanStatus(markedTrue, rule) {
  const isPositive = rule === POSITIVE_RULES.NO_IS_GOOD ? !markedTrue : markedTrue;
  return isPositive ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
}

function BooleanInput({ habit, habitValue, onChange }) {
  const rule    = habit.positive_rule;
  const current = habitValue.status;

  // Si positive_rule = no_is_good: Sí es negativo (✗), No es positivo (✓).
  // Si positive_rule = yes_is_good (o cualquier otro): Sí es positivo (✓), No es negativo (✗).
  const yesIsPositive = rule !== POSITIVE_RULES.NO_IS_GOOD;

  function select(markedTrue) {
    const status = booleanStatus(markedTrue, rule);
    onChange(makeHabitValue(habit, markedTrue ? 'true' : 'false', status));
  }

  function toggle(markedTrue) {
    const wouldBeStatus = booleanStatus(markedTrue, rule);
    if (current === wouldBeStatus) {
      // segundo clic sobre el mismo botón → deseleccionar
      onChange(makeHabitValue(habit, '', HABIT_STATUS.EMPTY));
    } else {
      select(markedTrue);
    }
  }

  // Clases de color: --done = verde, --not-done = rojo.
  // Usamos el STATUS del botón (lo que significaría pulsarlo), no el current.
  const yesStatus = booleanStatus(true,  rule); // qué status daría pulsar "Sí"
  const noStatus  = booleanStatus(false, rule); // qué status daría pulsar "No"

  return (
    <div className="habit-bool">
      <button
        className={`habit-bool-btn ${current === yesStatus ? (yesStatus === HABIT_STATUS.DONE ? 'habit-bool-btn--done' : 'habit-bool-btn--not-done') : ''}`}
        onClick={() => toggle(true)}
      >
        {yesIsPositive ? '✓ Sí' : '✗ Sí'}
      </button>
      <button
        className={`habit-bool-btn ${current === noStatus ? (noStatus === HABIT_STATUS.DONE ? 'habit-bool-btn--done' : 'habit-bool-btn--not-done') : ''}`}
        onClick={() => toggle(false)}
      >
        {yesIsPositive ? '✗ No' : '✓ No'}
      </button>
    </div>
  );
}

function CountInput({ habit, habitValue, onChange }) {
  const num    = habitValue.value === '' ? 0 : (parseInt(habitValue.value, 10) || 0);
  const target = parseInt(habit.target_value, 10) || null;
  function update(newVal) {
    const clamped = Math.max(0, newVal);
    const rule   = habit.positive_rule;
    let status   = clamped === 0 ? HABIT_STATUS.EMPTY
      : rule === POSITIVE_RULES.GREATER_EQUAL_TARGET ? (target !== null && clamped >= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE)
      : rule === POSITIVE_RULES.LOWER_EQUAL_TARGET   ? (target !== null && clamped <= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE)
      : clamped > 0 ? HABIT_STATUS.DONE : HABIT_STATUS.EMPTY;
    onChange(makeHabitValue(habit, clamped, status));
  }
  return (
    <div className="habit-count">
      <button className="habit-count-btn" onClick={() => update(num - 1)}>−</button>
      <input className="habit-count-input" type="number" inputMode="numeric" min="0"
        value={num} onChange={e => update(parseInt(e.target.value, 10) || 0)} />
      <button className="habit-count-btn" onClick={() => update(num + 1)}>+</button>
      {target !== null && <span className="habit-count-target text-muted">/ {target} {habit.unit || ''}</span>}
    </div>
  );
}

function DecimalInput({ habit, habitValue, onChange }) {
  const target = parseFloat(habit.target_value) || null;
  function update(strVal) {
    const num = parseFloat(strVal);
    let status = HABIT_STATUS.EMPTY;
    if (strVal !== '' && !isNaN(num)) {
      const rule = habit.positive_rule;
      status = rule === POSITIVE_RULES.GREATER_EQUAL_TARGET ? (target !== null && num >= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE)
             : rule === POSITIVE_RULES.LOWER_EQUAL_TARGET   ? (target !== null && num <= target ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE)
             : num > 0 ? HABIT_STATUS.DONE : HABIT_STATUS.NOT_DONE;
    }
    onChange(makeHabitValue(habit, strVal, status));
  }
  return (
    <div className="habit-decimal">
      <input className="habit-decimal-input" type="number" inputMode="decimal" step="0.1" min="0"
        value={habitValue.value} placeholder="0" onChange={e => update(e.target.value)} />
      {habit.unit && <span className="text-muted" style={{ fontSize: 13 }}>{habit.unit}</span>}
    </div>
  );
}

function RatingInput({ habit, habitValue, onChange }) {
  const max     = parseInt(habit.target_value, 10) || 5;
  const current = parseInt(habitValue.value, 10) || 0;
  function select(val) {
    const newVal = current === val ? 0 : val;
    onChange(makeHabitValue(habit, newVal, newVal === 0 ? HABIT_STATUS.EMPTY : HABIT_STATUS.DONE));
  }
  return (
    <div className="habit-rating">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} className={`habit-rating-btn ${n <= current ? 'habit-rating-btn--active' : ''}`}
          onClick={() => select(n)}>{n <= current ? '★' : '☆'}</button>
      ))}
    </div>
  );
}

export function HabitInput({ habit, habitValue, onChange }) {
  const type = habit.type;
  return (
    <div className="habit-row">
      <div className="habit-row__info">
        <span className="habit-row__name">{habit.name}</span>
        {habit.description && <span className="habit-row__desc text-muted">{habit.description}</span>}
      </div>
      <div className="habit-row__control">
        {type === HABIT_TYPES.BOOLEAN && <BooleanInput habit={habit} habitValue={habitValue} onChange={onChange} />}
        {type === HABIT_TYPES.COUNT   && <CountInput   habit={habit} habitValue={habitValue} onChange={onChange} />}
        {type === HABIT_TYPES.DECIMAL && <DecimalInput habit={habit} habitValue={habitValue} onChange={onChange} />}
        {type === HABIT_TYPES.RATING  && <RatingInput  habit={habit} habitValue={habitValue} onChange={onChange} />}
      </div>
    </div>
  );
}
