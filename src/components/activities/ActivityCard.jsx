/**
 * ActivityCard.jsx
 *
 * Tarjeta de una actividad individual.
 *
 * Estado del formulario inline:
 *   null         → formulario cerrado
 *   'create'     → formulario de nueva sesión
 *   <log object> → formulario de edición de ese registro
 */

import { useState } from 'react';
import { ActivityLogForm }    from './ActivityLogForm.jsx';
import { getActivityProgress } from '../../domain/activities.js';

export function ActivityCard({ activity, logsAll, date, onSaveLog, isSaving }) {
  // null | 'create' | { ...logObject }
  const [formState, setFormState] = useState(null);

  const progress = getActivityProgress(activity, logsAll, date);

  const todayLogs = (logsAll || []).filter(
    l => l.activity_id === activity.activity_id && l.date === date
  );

  function handleSave(payload) {
    const isEditing = formState !== null && formState !== 'create';
    onSaveLog(payload, () => setFormState(null), isEditing);
  }

  const showAddBtn  = formState === null;
  const showForm    = formState !== null;
  const isEditMode  = formState !== null && formState !== 'create';

  return (
    <div className="activity-card">

      {/* Cabecera: nombre + botón Registrar */}
      <div className="activity-card__header">
        <div className="activity-card__info">
          <span className="activity-card__name">
            {activity.emoji ? `${activity.emoji} ` : ''}{activity.name}
          </span>
          {activity.description && (
            <span className="activity-card__desc">{activity.description}</span>
          )}
        </div>

        {showAddBtn && (
          <button
            type="button"
            className="btn btn-primary activity-card__add-btn"
            onClick={() => setFormState('create')}
          >
            + Registrar
          </button>
        )}
      </div>

      {/* Progreso del periodo */}
      {activity.target_value && Number(activity.target_value) > 0 && (
        <div className="activity-progress">
          <div className="activity-progress__bar-wrap">
            <div
              className="activity-progress__bar"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="activity-progress__label">
            {progress.logged} / {progress.target} {progress.unit}
            {' '}· {activity.target_period || 'semana'}
            {' '}({progress.percent}%)
          </span>
        </div>
      )}

      {/* Registros del día con botón Editar */}
      {todayLogs.length > 0 && (
        <ul className="activity-log-list">
          {todayLogs.map((log, i) => (
            <li key={log.activity_log_id || i} className="activity-log-entry">
              <span className="activity-log-entry__index">#{i + 1}</span>

              {log.duration_min && log.duration_min !== '' && (
                <span>{log.duration_min} min</span>
              )}
              {log.distance_km && log.distance_km !== '' && (
                <span>{log.distance_km} km</span>
              )}
              {log.comment && log.comment !== '' && (
                <span className="activity-log-entry__comment">"{log.comment}"</span>
              )}

              {/* Botón editar — se oculta si hay un formulario abierto */}
              {formState === null && (
                <button
                  type="button"
                  className="activity-log-entry__edit-btn"
                  onClick={() => setFormState(log)}
                  aria-label={`Editar registro #${i + 1}`}
                >
                  Editar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Formulario inline (create o edit) */}
      {showForm && (
        <ActivityLogForm
          activity={activity}
          date={date}
          initialLog={isEditMode ? formState : null}
          mode={isEditMode ? 'edit' : 'create'}
          onSave={handleSave}
          onCancel={() => setFormState(null)}
          isSaving={isSaving}
        />
      )}

    </div>
  );
}
