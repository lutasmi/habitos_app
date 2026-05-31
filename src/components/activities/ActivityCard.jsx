/**
 * ActivityCard.jsx
 *
 * Tarjeta de una actividad individual.
 * Soporta crear, editar y eliminar registros de ACTIVITY_LOG.
 * El borrado pide confirmación inline y no afecta CONFIG_ACTIVITIES.
 */

import { useState } from 'react';
import { ActivityLogForm }    from './ActivityLogForm.jsx';
import { getActivityProgress } from '../../domain/activities.js';

export function ActivityCard({ activity, logsAll, date, onSaveLog, onDeleteLog, isSaving }) {
  const [formState,   setFormState]   = useState(null);   // null | 'create' | logObject
  const [confirmId,   setConfirmId]   = useState(null);   // activity_log_id pendiente de confirmar
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting,  setIsDeleting]  = useState(false);

  const progress  = getActivityProgress(activity, logsAll, date);
  const todayLogs = (logsAll || []).filter(
    l => l.activity_id === activity.activity_id && l.date === date
  );

  function handleSave(payload) {
    const isEditing = formState !== null && formState !== 'create';
    onSaveLog(payload, () => setFormState(null), isEditing);
  }

  async function handleDeleteConfirm(logId) {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await onDeleteLog(logId);
    if (result.ok) {
      setConfirmId(null);
    } else {
      setDeleteError(result.error || 'Error al eliminar. Inténtalo de nuevo.');
    }
    setIsDeleting(false);
  }

  const showAddBtn = formState === null && confirmId === null;
  const isEditMode = formState !== null && formState !== 'create';

  return (
    <div className="activity-card">

      {/* Cabecera */}
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
            <div className="activity-progress__bar" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="activity-progress__label">
            {progress.logged} / {progress.target} {progress.unit}
            {' '}· {activity.target_period || 'semana'}
            {' '}({progress.percent}%)
          </span>
        </div>
      )}

      {/* Error de borrado */}
      {deleteError && (
        <p className="activity-delete-error">{deleteError}</p>
      )}

      {/* Lista de registros del día */}
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

              {/* Acciones: Editar + Eliminar — solo si no hay formulario/confirmación abiertos */}
              {formState === null && confirmId === null && (
                <div className="activity-log-entry__actions">
                  <button
                    type="button"
                    className="activity-log-entry__edit-btn"
                    onClick={() => setFormState(log)}
                    aria-label={`Editar registro #${i + 1}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="activity-log-entry__delete-btn"
                    onClick={() => { setDeleteError(null); setConfirmId(log.activity_log_id); }}
                    aria-label={`Eliminar registro #${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Confirmación inline para este registro concreto */}
              {confirmId === log.activity_log_id && (
                <div className="activity-delete-confirm">
                  <span className="activity-delete-confirm__text">
                    ¿Eliminar este registro?
                  </span>
                  <button
                    type="button"
                    className="activity-delete-confirm__yes"
                    onClick={() => handleDeleteConfirm(log.activity_log_id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '…' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    className="activity-delete-confirm__no"
                    onClick={() => setConfirmId(null)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Formulario inline (create o edit) */}
      {formState !== null && (
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
