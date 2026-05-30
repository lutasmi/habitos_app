/**
 * ActivityLogForm.jsx
 *
 * Formulario en dos modos:
 *   create — nuevo registro, genera activity_log_id en cliente
 *   edit   — edición de registro existente, conserva activity_log_id y created_at
 *
 * Regla de visibilidad:
 *
 *   Modo create:
 *     Mostrar campo solo si requires_* = TRUE.
 *
 *   Modo edit:
 *     Mostrar campo si requires_* = TRUE  →  visible y OBLIGATORIO
 *     Mostrar campo si initialLog tiene valor histórico  →  visible pero OPCIONAL
 *     Ocultar campo si requires_* = FALSE y sin valor histórico
 *
 * Guardado:
 *   Campo visible  →  guardar valor editado por el usuario.
 *   Campo oculto en edit  →  conservar valor original de initialLog.
 *   Campo oculto en create  →  enviar vacío.
 */

import { useState } from 'react';
import { generateActivityLogId } from '../../domain/activities.js';

function isTrue(val) {
  return val === true || val === 'true';
}

function hasValue(val) {
  return val !== undefined && val !== null && String(val).trim() !== '';
}

export function ActivityLogForm({
  activity,
  date,
  initialLog = null,
  mode = 'create',
  onSave,
  onCancel,
  isSaving,
}) {
  const isEdit = mode === 'edit' && initialLog !== null;

  // Obligatoriedad: solo si el flag actual es TRUE
  const reqDuration = isTrue(activity.requires_duration);
  const reqDistance = isTrue(activity.requires_distance);
  const reqComment  = isTrue(activity.requires_comment);

  // Visibilidad:
  //   create → solo si required
  //   edit   → si required OR si el registro tiene valor histórico
  const showDuration = reqDuration || (isEdit && hasValue(initialLog.duration_min));
  const showDistance = reqDistance || (isEdit && hasValue(initialLog.distance_km));
  const showComment  = reqComment  || (isEdit && hasValue(initialLog.comment));

  // Estado inicial: en edit cargar valor histórico si el campo es visible
  const [durationMin, setDurationMin] = useState(
    showDuration && isEdit ? (initialLog.duration_min ?? '') : ''
  );
  const [distanceKm, setDistanceKm] = useState(
    showDistance && isEdit ? (initialLog.distance_km ?? '') : ''
  );
  const [comment, setComment] = useState(
    showComment && isEdit ? (initialLog.comment ?? '') : ''
  );
  const [error, setError] = useState(null);

  function validate() {
    // Solo obligatorio si su requires_* es TRUE (no si aparece por valor histórico)
    if (reqDuration && String(durationMin).trim() === '') return 'La duración es obligatoria.';
    if (reqDistance && String(distanceKm).trim()  === '') return 'La distancia es obligatoria.';
    if (reqComment  && comment.trim()             === '') return 'El comentario es obligatorio.';
    return null;
  }

  function handleSubmit() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);

    const logId = isEdit
      ? initialLog.activity_log_id
      : generateActivityLogId(date);

    onSave({
      activity_log_id: logId,
      date,
      activity_id: activity.activity_id,
      // Campo visible  → valor editado por el usuario
      // Campo oculto en edit  → preservar original (no borrar histórico)
      // Campo oculto en create → vacío
      duration_min: showDuration
        ? (durationMin !== '' ? Number(durationMin) : '')
        : (isEdit ? (initialLog.duration_min ?? '') : ''),
      distance_km: showDistance
        ? (distanceKm !== '' ? Number(distanceKm) : '')
        : (isEdit ? (initialLog.distance_km ?? '') : ''),
      comment: showComment
        ? comment.trim()
        : (isEdit ? (initialLog.comment ?? '') : ''),
    });
  }

  const noFields = !showDuration && !showDistance && !showComment;

  // Etiqueta de campo: añade ' *' solo si es obligatorio por config actual
  function label(text, required) {
    return required ? `${text} *` : text;
  }

  return (
    <div className="activity-log-form">
      <div className="activity-log-form__header">
        <span className="activity-log-form__title">
          {isEdit
            ? 'Editar registro'
            : `${activity.emoji ? activity.emoji + ' ' : ''}${activity.name}`}
        </span>
        {!isEdit && activity.description && (
          <span className="activity-log-form__desc">{activity.description}</span>
        )}
      </div>

      <div className="activity-log-form__fields">

        {showDuration && (
          <div className="form-field">
            <label className="form-label">{label('Duración (min)', reqDuration)}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className="form-input"
              placeholder="ej. 45"
              value={durationMin}
              onChange={e => setDurationMin(e.target.value)}
            />
          </div>
        )}

        {showDistance && (
          <div className="form-field">
            <label className="form-label">{label('Distancia (km)', reqDistance)}</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              className="form-input"
              placeholder="ej. 5.2"
              value={distanceKm}
              onChange={e => setDistanceKm(e.target.value)}
            />
          </div>
        )}

        {showComment && (
          <div className="form-field">
            <label className="form-label">{label('Comentario', reqComment)}</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder={reqComment ? 'Escribe un comentario' : 'Opcional'}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
        )}

        {noFields && (
          <p className="text-muted" style={{ fontSize: 13 }}>
            Esta actividad no requiere datos adicionales.
          </p>
        )}

      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="activity-log-form__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar sesión'}
        </button>
      </div>
    </div>
  );
}
