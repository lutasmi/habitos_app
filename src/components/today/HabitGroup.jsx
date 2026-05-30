/**
 * HabitGroup.jsx
 *
 * Grupo colapsable de hábitos.
 * El estado abierto/cerrado es local; respeta open_by_default de la config.
 */

import { useState } from 'react';
import { HabitInput } from './HabitInput.jsx';

export function HabitGroup({ group, habitValues, onHabitChange }) {
  const defaultOpen = group.open_by_default === 'true' || group.open_by_default === true;
  const [isOpen, setIsOpen] = useState(defaultOpen !== false); // abierto por defecto

  const habits = group.habits || [];
  const doneCount = habits.filter(h => {
    const hv = habitValues[h.habit_id];
    return hv && (hv.status === 'done' || hv.status === 'not_done');
  }).length;

  return (
    <div className="habit-group">
      <button
        className="habit-group__header"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
      >
        <span className="habit-group__title">
          {group.emoji && <span className="habit-group__emoji">{group.emoji}</span>}
          {group.name}
        </span>
        <span className="habit-group__meta">
          <span className="habit-group__count text-muted">
            {doneCount}/{habits.length}
          </span>
          <span className="habit-group__chevron" aria-hidden="true">
            {isOpen ? '▾' : '▸'}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="habit-group__body">
          {habits.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13, padding: '8px 0' }}>
              Sin hábitos en este grupo.
            </p>
          ) : (
            habits.map(habit => (
              <HabitInput
                key={habit.habit_id}
                habit={habit}
                habitValue={habitValues[habit.habit_id] || {
                  habit_id: habit.habit_id,
                  value: '',
                  status: 'empty',
                  score_value: 0,
                }}
                onChange={newVal => onHabitChange(habit.habit_id, newVal)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
