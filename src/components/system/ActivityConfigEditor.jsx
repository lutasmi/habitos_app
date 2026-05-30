/**
 * ActivityConfigEditor.jsx
 *
 * Lista de actividades agrupadas por grupo con editor inline.
 *
 * Modos:
 *   edit   — activity_id no editable, conserva histórico
 *   create — activity_id editable, se prerrellena desde el nombre
 *
 * Reglas de ID:
 *   - solo minúsculas, números y guion_bajo
 *   - debe ser único entre actividades existentes
 *   - recomendado que empiece por "act_"
 *   - una vez creado, nunca se puede cambiar
 */

import { useState, useEffect } from 'react';
import { saveConfigToSheets } from '../../services/syncService.js';

const VALID_PERIODS = ['week', 'month', 'quarter', 'year'];
const ID_REGEX = /^[a-z0-9_]+$/;

// ── Helpers de ID ─────────────────────────────────────────────────────────────

function suggestActivityId(name) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return base ? `act_${base}` : 'act_';
}

// ── Validación ────────────────────────────────────────────────────────────────

function validateActivityForm(draft, config, isCreate) {
  const groupIds    = new Set((config.activityGroups || []).map(g => g.group_id));
  const existingIds = new Set((config.activities     || []).map(a => a.activity_id));

  if (isCreate) {
    if (!draft.activity_id.trim())         return 'El activity_id es obligatorio.';
    if (!ID_REGEX.test(draft.activity_id)) return 'activity_id solo puede contener minúsculas, números y guion_bajo.';
    if (existingIds.has(draft.activity_id)) return `activity_id "${draft.activity_id}" ya existe. Elige otro.`;
  }

  if (!draft.name.trim())            return 'El nombre es obligatorio.';
  if (!groupIds.has(draft.group_id)) return `group_id "${draft.group_id}" no existe en CONFIG_ACTIVITY_GROUPS.`;
  if (draft.target_value !== '' && isNaN(parseFloat(draft.target_value))) return 'target_value debe ser numérico.';
  if (draft.target_period !== '' && !VALID_PERIODS.includes(draft.target_period))
    return `target_period "${draft.target_period}" no válido. Usa: ${VALID_PERIODS.join(', ')}.`;
  if (draft.sort_order !== '' && isNaN(parseFloat(draft.sort_order))) return 'sort_order debe ser numérico.';
  return null;
}

// ── Formulario inline (create y edit) ────────────────────────────────────────

function ActivityForm({ activity, config, isCreate, onSaved, onCancel }) {
  const defaultGroupId = (config.activityGroups || []).find(
    g => g.active === 'true' || g.active === true
  )?.group_id || '';

  const [draft, setDraft] = useState({
    activity_id:        activity.activity_id        || '',
    name:               activity.name               || '',
    description:        activity.description        || '',
    group_id:           activity.group_id           || defaultGroupId,
    target_value:       activity.target_value       || '',
    target_period:      activity.target_period      || 'week',
    target_unit:        activity.target_unit        || '',
    requires_duration:  activity.requires_duration === 'true' || activity.requires_duration === true,
    requires_distance:  activity.requires_distance === 'true' || activity.requires_distance === true,
    requires_comment:   activity.requires_comment  === 'true' || activity.requires_comment  === true,
    sort_order:         activity.sort_order         || '',
    active:             activity.active  === 'true' || activity.active  === true || isCreate,
    visible:            activity.visible === 'true' || activity.visible === true || isCreate,
  });

  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  // En create: prerrellena activity_id desde el nombre si el usuario no lo ha tocado
  useEffect(() => {
    if (isCreate && !idManuallyEdited && draft.name) {
      set('activity_id', suggestActivityId(draft.name));
    }
  }, [draft.name, isCreate, idManuallyEdited]);

  async function handleSave() {
    const err = validateActivityForm(draft, config, isCreate);
    if (err) { setSaveMsg({ ok: false, text: err }); return; }

    setSaving(true);
    setSaveMsg(null);

    const now = new Date().toISOString();
    const record = {
      ...(isCreate ? {} : activity),
      activity_id:        draft.activity_id,
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
      created_at:         isCreate ? now : (activity.created_at || now),
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

  const idHint = isCreate && draft.activity_id && !draft.activity_id.startsWith('act_')
    ? '⚠ Se recomienda que empiece por "act_"'
    : null;

  return (
    <div className="ce-form">
      <div className="ce-form__grid">

        {/* activity_id — editable en create, readonly en edit */}
        <div className="ce-field ce-form__full">
          <label className={`ce-label${isCreate ? '' : ' ce-label--readonly'}`}>
            activity_id {isCreate ? '(editable antes de crear)' : '(no editable)'}
          </label>
          <input
            className={`ce-input${isCreate ? '' : ' ce-input--readonly'}`}
            value={draft.activity_id}
            readOnly={!isCreate}
            onChange={e => {
              setIdManuallyEdited(true);
              set('activity_id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            }}
            placeholder="act_mi_actividad"
          />
          {idHint && (
            <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>{idHint}</span>
          )}
        </div>

        {/* Nombre */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Nombre *</label>
          <input className="ce-input" value={draft.name}
            onChange={e => set('name', e.target.value)} />
        </div>

        {/* Descripción */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Descripción</label>
          <input className="ce-input" value={draft.description}
            onChange={e => set('description', e.target.value)} />
        </div>

        {/* Grupo */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Grupo *</label>
          <select className="ce-select" value={draft.group_id}
            onChange={e => set('group_id', e.target.value)}>
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
          <select className="ce-select" value={draft.target_period}
            onChange={e => set('target_period', e.target.value)}>
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
            <input type="checkbox" id={`dur-${draft.activity_id || 'new'}`}
              checked={draft.requires_duration}
              onChange={e => set('requires_duration', e.target.checked)} />
            <label htmlFor={`dur-${draft.activity_id || 'new'}`}>Requiere duración (min)</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`dist-${draft.activity_id || 'new'}`}
              checked={draft.requires_distance}
              onChange={e => set('requires_distance', e.target.checked)} />
            <label htmlFor={`dist-${draft.activity_id || 'new'}`}>Requiere distancia (km)</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`com-${draft.activity_id || 'new'}`}
              checked={draft.requires_comment}
              onChange={e => set('requires_comment', e.target.checked)} />
            <label htmlFor={`com-${draft.activity_id || 'new'}`}>Requiere comentario</label>
          </div>
        </div>

        {/* Active / Visible */}
        <div className="ce-field">
          <label className="ce-label">Estado</label>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`active-${draft.activity_id || 'new'}`}
              checked={draft.active} onChange={e => set('active', e.target.checked)} />
            <label htmlFor={`active-${draft.activity_id || 'new'}`}>Activo</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`visible-${draft.activity_id || 'new'}`}
              checked={draft.visible} onChange={e => set('visible', e.target.checked)} />
            <label htmlFor={`visible-${draft.activity_id || 'new'}`}>Visible</label>
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
          {saving ? 'Guardando…' : isCreate ? 'Crear actividad' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Fila de actividad (edit) ──────────────────────────────────────────────────

function ActivityRow({ activity, config, onSaved }) {
  const [editing, setEditing] = useState(false);
  const isActive = activity.active === 'true' || activity.active === true;

  return (
    <div className="ce-item">
      {!editing && (
        <div className="ce-item__row">
          <div className="ce-item__info">
            <span className={`ce-item__name${!isActive ? ' ce-item__name--inactive' : ''}`}>
              {activity.name}
            </span>
            <span className="ce-item__meta">
              {activity.target_value
                ? `${activity.target_value} ${activity.target_unit || 'sesiones'} / ${activity.target_period || 'semana'}`
                : 'sin objetivo'}
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
          isCreate={false}
          onSaved={saved => { onSaved(saved); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ActivityConfigEditor({ config, onConfigUpdated }) {
  const [creating, setCreating] = useState(false);

  const groups     = (config.activityGroups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const activities = config.activities || [];

  function handleSaved(record, isNew = false) {
    const newActivities = isNew
      ? [...activities, record]
      : activities.map(a => a.activity_id === record.activity_id ? record : a);
    onConfigUpdated({ ...config, activities: newActivities });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Botón crear */}
      {!creating && (
        <button type="button" className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setCreating(true)}>
          + Nueva actividad
        </button>
      )}

      {/* Formulario de creación */}
      {creating && (
        <div className="ce-group">
          <div className="ce-group__header">Nueva actividad</div>
          <ActivityForm
            activity={{}}
            config={config}
            isCreate={true}
            onSaved={record => { handleSaved(record, true); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Lista agrupada */}
      {!groups.length && (
        <div className="ce-empty">No hay grupos de actividades configurados en Google Sheets.</div>
      )}

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
              <ActivityRow key={activity.activity_id} activity={activity} config={config}
                onSaved={record => handleSaved(record, false)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
