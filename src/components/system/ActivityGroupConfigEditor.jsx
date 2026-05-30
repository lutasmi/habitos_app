/**
 * ActivityGroupConfigEditor.jsx
 *
 * Editor de CONFIG_ACTIVITY_GROUPS.
 *
 * Idéntico en estructura a HabitGroupConfigEditor pero sin open_by_default,
 * usando CONFIG_ACTIVITY_GROUPS como sheetName y prefijo "grp_a_".
 */

import { useState, useEffect } from 'react';
import { saveConfigToSheets } from '../../services/syncService.js';

const ID_REGEX = /^[a-z0-9_]+$/;

function suggestGroupId(name) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 28);
  return base ? `grp_a_${base}` : 'grp_a_';
}

function countActivitiesInGroup(groupId, activities) {
  return (activities || []).filter(a => a.group_id === groupId).length;
}

function validate(draft, existingGroups, isCreate) {
  if (isCreate) {
    if (!draft.group_id.trim())         return 'El group_id es obligatorio.';
    if (!ID_REGEX.test(draft.group_id)) return 'group_id solo puede contener minúsculas, números y guion_bajo.';
    const existingIds = new Set(existingGroups.map(g => g.group_id));
    if (existingIds.has(draft.group_id)) return `group_id "${draft.group_id}" ya existe. Elige otro.`;
  }
  if (!draft.name.trim()) return 'El nombre es obligatorio.';
  if (draft.sort_order !== '' && isNaN(parseFloat(draft.sort_order)))
    return 'sort_order debe ser numérico.';
  return null;
}

function GroupForm({ group, allGroups, isCreate, onSaved, onCancel }) {
  const [draft, setDraft] = useState({
    group_id:   group.group_id   || '',
    name:       group.name       || '',
    emoji:      group.emoji      || '',
    color:      group.color      || '',
    sort_order: group.sort_order || '',
    active:     group.active  === 'true' || group.active  === true || isCreate,
    visible:    group.visible === 'true' || group.visible === true || isCreate,
  });

  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  useEffect(() => {
    if (isCreate && !idManuallyEdited && draft.name) {
      set('group_id', suggestGroupId(draft.name));
    }
  }, [draft.name, isCreate, idManuallyEdited]);

  async function handleSave() {
    const err = validate(draft, allGroups, isCreate);
    if (err) { setSaveMsg({ ok: false, text: err }); return; }

    setSaving(true);
    setSaveMsg(null);

    const now = new Date().toISOString();
    const record = {
      ...(isCreate ? {} : group),
      group_id:   draft.group_id,
      name:       draft.name.trim(),
      emoji:      draft.emoji.trim(),
      color:      draft.color.trim(),
      sort_order: draft.sort_order,
      active:     draft.active  ? 'true' : 'false',
      visible:    draft.visible ? 'true' : 'false',
      updated_at: now,
      created_at: isCreate ? now : (group.created_at || now),
    };

    const result = await saveConfigToSheets({
      sheetName:  'CONFIG_ACTIVITY_GROUPS',
      primaryKey: 'group_id',
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

  const idHint = isCreate && draft.group_id && !draft.group_id.startsWith('grp_a_')
    ? '⚠ Se recomienda que empiece por "grp_a_"'
    : null;

  return (
    <div className="ce-form">
      <div className="ce-form__grid">

        <div className="ce-field ce-form__full">
          <label className={`ce-label${isCreate ? '' : ' ce-label--readonly'}`}>
            group_id {isCreate ? '(editable antes de crear)' : '(no editable)'}
          </label>
          <input
            className={`ce-input${isCreate ? '' : ' ce-input--readonly'}`}
            value={draft.group_id}
            readOnly={!isCreate}
            onChange={e => {
              setIdManuallyEdited(true);
              set('group_id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            }}
            placeholder="grp_a_mi_grupo"
          />
          {idHint && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>{idHint}</span>}
        </div>

        <div className="ce-field ce-form__full">
          <label className="ce-label">Nombre *</label>
          <input className="ce-input" value={draft.name}
            onChange={e => set('name', e.target.value)} placeholder="ej. Deporte" />
        </div>

        <div className="ce-field">
          <label className="ce-label">Emoji</label>
          <input className="ce-input" value={draft.emoji}
            onChange={e => set('emoji', e.target.value)} placeholder="ej. 🏃" />
        </div>
        <div className="ce-field">
          <label className="ce-label">Color (HEX)</label>
          <input className="ce-input" value={draft.color}
            onChange={e => set('color', e.target.value)} placeholder="ej. #2563eb" />
        </div>

        <div className="ce-field">
          <label className="ce-label">sort_order</label>
          <input className="ce-input" type="number" step="1" value={draft.sort_order}
            onChange={e => set('sort_order', e.target.value)} placeholder="ej. 1" />
        </div>

        <div className="ce-field">
          <label className="ce-label">Estado</label>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`act-${draft.group_id || 'new'}`}
              checked={draft.active} onChange={e => set('active', e.target.checked)} />
            <label htmlFor={`act-${draft.group_id || 'new'}`}>Activo</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`vis-${draft.group_id || 'new'}`}
              checked={draft.visible} onChange={e => set('visible', e.target.checked)} />
            <label htmlFor={`vis-${draft.group_id || 'new'}`}>Visible</label>
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
          {saving ? 'Guardando…' : isCreate ? 'Crear grupo' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function GroupRow({ group, allGroups, activities, onSaved }) {
  const [editing, setEditing] = useState(false);
  const isActive      = group.active === 'true' || group.active === true;
  const activityCount = countActivitiesInGroup(group.group_id, activities);

  return (
    <div className="ce-item">
      {!editing && (
        <div className="ce-item__row">
          <div className="ce-item__info">
            <span className={`ce-item__name${!isActive ? ' ce-item__name--inactive' : ''}`}>
              {group.emoji ? `${group.emoji} ` : ''}{group.name}
            </span>
            <span className="ce-item__meta">
              {activityCount} actividad{activityCount !== 1 ? 'es' : ''}
              {!isActive ? ' · inactivo' : ''}
              {group.sort_order ? ` · orden ${group.sort_order}` : ''}
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
        <GroupForm
          group={group}
          allGroups={allGroups}
          isCreate={false}
          onSaved={saved => { onSaved(saved); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export function ActivityGroupConfigEditor({ config, onConfigUpdated }) {
  const [creating, setCreating] = useState(false);

  const groups     = (config.activityGroups || [])
    .slice().sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const activities = config.activities || [];

  function handleSaved(record, isNew = false) {
    const newGroups = isNew
      ? [...groups, record]
      : groups.map(g => g.group_id === record.group_id ? record : g);
    onConfigUpdated({ ...config, activityGroups: newGroups });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {!creating && (
        <button type="button" className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setCreating(true)}>
          + Nuevo grupo de actividades
        </button>
      )}

      {creating && (
        <div className="ce-group">
          <div className="ce-group__header">Nuevo grupo de actividades</div>
          <GroupForm
            group={{}}
            allGroups={groups}
            isCreate={true}
            onSaved={record => { handleSaved(record, true); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {groups.length === 0 && !creating && (
        <div className="ce-empty">No hay grupos de actividades configurados todavía.</div>
      )}

      {groups.length > 0 && (
        <div className="ce-group">
          <div className="ce-group__header">Grupos existentes</div>
          {groups.map(group => (
            <GroupRow
              key={group.group_id}
              group={group}
              allGroups={groups}
              activities={activities}
              onSaved={record => handleSaved(record, false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
