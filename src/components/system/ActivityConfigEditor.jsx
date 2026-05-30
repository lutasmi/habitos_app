/**
 * ActivityConfigEditor.jsx
 *
 * Lista de actividades agrupadas por grupo con editor inline.
 * Campos editables según Fase 6.1.
 * activity_id: solo lectura (nunca editable, conserva histórico).
 */

import { useState } from 'react';
import { saveConfigToSheets } from '../../services/syncService.js';

const VALID_PERIODS = ['week', 'month', 'quarter', 'year'];

// ── Validación ────────────────────────────────────────────────────────────────

function validateActivityForm(draft, config) {
  const groupIds = new Set((config.activityGroups || []).map(g => g.group_id));
  if (!draft.name.trim())             return 'El nombre es obligatorio.';
  if (!groupIds.has(draft.group_id))  return `group_id "${draft.group_id}" no existe en CONFIG_ACTIVITY_GROUPS.`;
  if (draft.target_value !== '' && isNaN(parseFloat(draft.target_value))) return 'target_value debe ser numérico.';
  if (draft.target_period !== '' && !VALID_PERIODS.includes(draft.target_period))
    return `target_period "${draft.target_period}" no válido. Usa: ${VALID_PERIODS.join(', ')}.`;
  if (draft.sort_order !== '' && isNaN(parseFloat(draft.sort_order))) return 'sort_order debe ser numérico.';
  return null;
}

// ── Formulario inline ─────────────────────────────────────────────────────────

function ActivityForm({ activity, config, onSaved, onCancel }) {
  const [draft, setDraft]    = useState({
    name:               activity.name               || '',
    description:        activity.description        || '',
    group_id:           activity.group_id           || '',
    target_value:       activity.target_value       || '',
    target_period:      activity.target_period      || 'week',
    target_unit:        activity.target_unit        || '',
    requires_duration:  activity.requires_duration === 'true' || activity.requires_duration === true,
    requires_distance:  activity.requires_distance === 'true' || activity.requires_distance === true,
    requires_comment:   activity.requires_comment  === 'true' || activity.requires_comment  === true,
    sort_order:         activity.sort_order         || '',
    active:             activity.active  === 'true' || activity.active  === true,
    visible:            activity.visible === 'true' || activity.visible === true,
  });
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  async function handleSave() {
    const err = validateActivityForm(draft, config);
    if (err) { setSaveMsg({ ok: false, text: err }); return; }

    setSaving(true);
    setSaveMsg(null);

    const now = new Date().toISOString();
    const record = {
      ...activity,
      name:               draft.name.trim(),
      description:        draft.description.trim(),
      group_id:           draft.group_id,
      target_value:       draft.target_value,
      target_period:      draft.target_period,
      target_unit:        draft.target_unit.trim(),
      requires_duration:  draft.requires_duration ? 'true' : 'false',
      requires_distance:  draft.requires_distance ? 'true' : 'false',
      requires_comment:   draft.requires_comment  ? 'true' : 'false',
      sort_order:         draft.sort_order,
      active:             draft.active  ? 'true' : 'false',
      visible:            draft.visible ? 'true' : 'false',
      updated_at:         now,
    };

    const result = await saveConfigToSheets({
      sheetName:  'CONFIG_ACTIVITIES',
      primaryKey: 'activity_id',
      records:    [record],
    });

    if (result.ok) {
      setSaveMsg({ ok: true, text: 'Guardado correctamente.' });
      onSaved(record);
    } else {
      setSaveMsg({ ok: false, text: result.error || 'Error al guardar.' });
    }
    setSaving(false);
  }

  const groups = (config.activityGroups || []).filter(
    g => g.active === 'true' || g.active === true
  );

  return (
    <div className="ce-form">
      <div className="ce-form__grid">

        {/* ID — solo lectura */}
        <div className="ce-field ce-form__full">
          <label className="ce-label ce-label--readonly">activity_id (no editable)</label>
          <input className="ce-input ce-input--readonly" value={activity.activity_id} readOnly />
        </div>

        {/* Nombre */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Nombre *</label>
          <input className="ce-input" value={draft.name} onChange={e => set('name', e.target.value)} />
        </div>

        {/* Descripción */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Descripción</label>
          <input className="ce-input" value={draft.description} onChange={e => set('description', e.target.value)} />
        </div>

        {/* Grupo */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Grupo *</label>
          <select className="ce-select" value={draft.group_id} onChange={e => set('group_id', e.target.value)}>
            {groups.map(g => (
              <option key={g.group_id} value={g.group_id}>
                {g.emoji ? g.emoji + ' ' : ''}{g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target */}
        <div className="ce-field">
          <label className="ce-label">Objetivo (valor)</label>
          <input className="ce-input" type="number" step="any" value={draft.target_value}
            onChange={e => set('target_value', e.target.value)} placeholder="ej. 3" />
        </div>
        <div className="ce-field">
          <label className="ce-label">Unidad</label>
          <input className="ce-input" value={draft.target_unit}
            onChange={e => set('target_unit', e.target.value)} placeholder="sesiones, km, min" />
        </div>

        {/* Periodo */}
        <div className="ce-field">
          <label className="ce-label">Periodo objetivo</label>
          <select className="ce-select" value={draft.target_period} onChange={e => set('target_period', e.target.value)}>
            {VALID_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Sort order */}
        <div className="ce-field">
          <label className="ce-label">sort_order</label>
          <input className="ce-input" type="number" step="1" value={draft.sort_order}
            onChange={e => set('sort_order', e.target.value)} placeholder="ej. 1" />
        </div>

        {/* Campos requeridos */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Campos al registrar</label>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`dur-${activity.activity_id}`} checked={draft.requires_duration}
              onChange={e => set('requires_duration', e.target.checked)} />
            <label htmlFor={`dur-${activity.activity_id}`}>Requiere duración (min)</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`dist-${activity.activity_id}`} checked={draft.requires_distance}
              onChange={e => set('requires_distance', e.target.checked)} />
            <label htmlFor={`dist-${activity.activity_id}`}>Requiere distancia (km)</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`com-${activity.activity_id}`} checked={draft.requires_comment}
              onChange={e => set('requires_comment', e.target.checked)} />
            <label htmlFor={`com-${activity.activity_id}`}>Requiere comentario</label>
          </div>
        </div>

        {/* Active / Visible */}
        <div className="ce-field">
          <label className="ce-label">Estado</label>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`active-${activity.activity_id}`} checked={draft.active}
              onChange={e => set('active', e.target.checked)} />
            <label htmlFor={`active-${activity.activity_id}`}>Activo</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`visible-${activity.activity_id}`} checked={draft.visible}
              onChange={e => set('visible', e.target.checked)} />
            <label htmlFor={`visible-${activity.activity_id}`}>Visible</label>
          </div>
        </div>

      </div>

      {saveMsg && (
        <p className={`ce-save-msg ce-save-msg--${saveMsg.ok ? 'ok' : 'error'}`}>
          {saveMsg.text}
        </p>
      )}

      <div className="ce-form__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Fila de actividad ─────────────────────────────────────────────────────────

function ActivityRow({ activity, config, onSaved }) {
  const [editing, setEditing] = useState(false);
  const isActive = activity.active === 'true' || activity.active === true;

  function handleSaved(updated) {
    onSaved(updated);
    setEditing(false);
  }

  return (
    <div className="ce-item">
      {!editing && (
        <div className="ce-item__row">
          <div className="ce-item__info">
            <span className={`ce-item__name${!isActive ? ' ce-item__name--inactive' : ''}`}>
              {activity.name}
            </span>
            <span className="ce-item__meta">
              {activity.target_value ? `${activity.target_value} ${activity.target_unit || 'sesiones'} / ${activity.target_period || 'semana'}` : 'sin objetivo'}
              {!isActive ? ' · inactivo' : ''}
            </span>
          </div>
          <div className="ce-item__actions">
            <button type="button" className="ce-edit-btn" onClick={() => setEditing(true)}>
              Editar
            </button>
          </div>
        </div>
      )}
      {editing && (
        <ActivityForm
          activity={activity}
          config={config}
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ActivityConfigEditor({ config, onConfigUpdated }) {
  const groups = (config.activityGroups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  const activities = config.activities || [];

  if (!groups.length) {
    return (
      <div className="ce-empty">
        No hay grupos de actividades configurados en Google Sheets.
      </div>
    );
  }

  function handleSaved(updated) {
    const newActivities = activities.map(a =>
      a.activity_id === updated.activity_id ? updated : a
    );
    onConfigUpdated({ ...config, activities: newActivities });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map(group => {
        const groupActivities = activities
          .filter(a => a.group_id === group.group_id)
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

        if (!groupActivities.length) return null;

        return (
          <div key={group.group_id} className="ce-group">
            <div className="ce-group__header">
              {group.emoji ? group.emoji + ' ' : ''}{group.name}
            </div>
            {groupActivities.map(activity => (
              <ActivityRow
                key={activity.activity_id}
                activity={activity}
                config={config}
                onSaved={handleSaved}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
