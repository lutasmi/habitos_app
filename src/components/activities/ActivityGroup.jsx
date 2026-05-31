/**
 * ActivityGroup.jsx
 *
 * Grupo colapsable de actividades.
 * Patrón idéntico al HabitGroup de la pantalla de hábitos.
 */

import { useState } from 'react';
import { ActivityCard } from './ActivityCard.jsx';

export function ActivityGroup({ group, logsAll, date, onSaveLog, onDeleteLog, isSaving }) {
  const [isOpen, setIsOpen] = useState(true);
  const activities = group.activities || [];

  // Sesiones registradas hoy en este grupo
  const todayCount = (logsAll || []).filter(
    l => activities.some(a => a.activity_id === l.activity_id) && l.date === date
  ).length;

  return (
    <div className="habit-group"> {/* reutiliza estilos de grupos de hábitos */}
      <button
        type="button"
        className="habit-group__header"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
      >
        <span className="habit-group__title">
          {group.emoji && <span className="habit-group__emoji">{group.emoji}</span>}
          {group.name}
        </span>
        <span className="habit-group__meta">
          {todayCount > 0 && (
            <span className="habit-group__count text-muted">
              {todayCount} hoy
            </span>
          )}
          <span className="habit-group__chevron" aria-hidden="true">
            {isOpen ? '▾' : '▸'}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="habit-group__body">
          {activities.map(activity => (
            <ActivityCard
              key={activity.activity_id}
              activity={activity}
              logsAll={logsAll}
              date={date}
              onSaveLog={onSaveLog}
              onDeleteLog={onDeleteLog}
              isSaving={isSaving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
