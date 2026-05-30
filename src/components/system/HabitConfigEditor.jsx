/**
 * HabitConfigEditor.jsx
 *
 * Lista de hábitos agrupados por grupo con editor inline.
 *
 * Modos:
 *   edit   — habit_id no editable, conserva histórico
 *   create — habit_id editable, se prerrellena desde el nombre
 *
 * Reglas de ID:
 *   - solo minúsculas, números y guion_bajo
 *   - debe ser único entre hábitos existentes
 *   - recomendado que empiece por "hab_"
 *   - una vez creado, nunca se puede cambiar
 */

import { useState, useEffect } from 'react';
import { saveConfigToSheets } from '../../services/syncService.js';

const POSITIVE_RULES = ['yes_is_good', 'no_is_good', 'greater_equal_target', 'lower_equal_target'];
const ID_REGEX = /^[a-z0-9_]+$/;

// ── Helpers de ID ─────────────────────────────────────────────────────────────

/** Genera un ID sugerido a partir de un nombre legible. */
function suggestHabitId(name) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return base ? `hab_${base}` : 'hab_';
}

// ── Validación ────────────────────────────────────────────────────────────────

function validateHabitForm(draft, config, isCreate) {
  const groupIds   = new Set((config.habitGroups || []).map(g => g.group_id));
  const existingIds = new Set((config.habits || []).map(h => h.habit_id));

  if (isCreate) {
    if (!draft.habit_id.trim())        return 'El habit_id es obligatorio.';
    if (!ID_REGEX.test(draft.habit_id)) return 'habit_id solo puede contener minúsculas, números y guion_bajo.';
    if (existingIds.has(draft.habit_id)) return `habit_id "${draft.habit_id}" ya existe. Elige otro.`;
  }

  if (!draft.name.trim())            return 'El nombre es obligatorio.';
  if (!groupIds.has(draft.group_id)) return `group_id "${draft.group_id}" no existe en CONFIG_HABIT_GROUPS.`;
  if (!POSITIVE_RULES.includes(draft.positive_rule)) return 'positive_rule no válida.';
  if (draft.target_value !== '' && isNaN(parseFloat(draft.target_value))) return 'target_value debe ser numérico.';
  if (draft.score_weight !== '' && isNaN(parseFloat(draft.score_weight))) return 'score_weight debe ser numérico.';
  if (draft.score_min    !== '' && isNaN(parseFloat(draft.score_min)))    return 'score_min debe ser numérico.';
  if (draft.score_max    !== '' && isNaN(parseFloat(draft.score_max)))    return 'score_max debe ser numérico.';
  if (draft.sort_order   !== '' && isNaN(parseFloat(draft.sort_order)))   return 'sort_order debe ser numérico.';
  return null;
}

// ── Formulario inline (create y edit) ────────────────────────────────────────

function HabitForm({ habit, config, isCreate, onSaved, onCancel }) {
  const defaultGroupId = (config.habitGroups || []).find(
    g => g.active === 'true' || g.active === true
  )?.group_id || '';

  const [draft, setDraft] = useState({
    habit_id:      habit.habit_id      || '',
    name:          habit.name          || '',
    description:   habit.description   || '',
    group_id:      habit.group_id      || defaultGroupId,
    target_value:  habit.target_value  || '',
    unit:          habit.unit          || '',
    positive_rule: habit.positive_rule || 'yes_is_good',
    score_weight:  habit.score_weight  || '',
    score_min:     habit.score_min     || '',
    score_max:     habit.score_max     || '',
    sort_order:    habit.sort_order    || '',
    active:        habit.active  === 'true' || habit.active  === true || isCreate,
    visible:       habit.visible === 'true' || habit.visible === true || isCreate,
    // type solo editable en create
    type:          habit.type          || 'boolean',
  });

  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  // En create: prerrellena habit_id desde el nombre si el usuario no lo ha tocado
  useEffect(() => {
    if (isCreate && !idManuallyEdited && draft.name) {
      set('habit_id', suggestHabitId(draft.name));
    }
  }, [draft.name, isCreate, idManuallyEdited]);

  async function handleSave() {
    const err = validateHabitForm(draft, config, isCreate);
    if (err) { setSaveMsg({ ok: false, text: err }); return; }

    setSaving(true);
    setSaveMsg(null);

    const now = new Date().toISOString();
    const record = {
      ...(isCreate ? {} : habit),   // en create no arrastramos campos del template vacío
      habit_id:      draft.habit_id,
      name:          draft.name.trim(),
      description:   draft.description.trim(),
      group_id:      draft.group_id,
      type:          draft.type,
      target_value:  draft.target_value,
      unit:          draft.unit.trim(),
      positive_rule: draft.positive_rule,
      score_weight:  draft.score_weight,
      score_min:     draft.score_min,
      score_max:     draft.score_max,
      sort_order:    draft.sort_order,
      active:        draft.active  ? 'true' : 'false',
      visible:       draft.visible ? 'true' : 'false',
      updated_at:    now,
      created_at:    isCreate ? now : (habit.created_at || now),
    };

    const result = await saveConfigToSheets({
      sheetName:  'CONFIG_HABITS',
      primaryKey: 'habit_id',
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

  const groups  = (config.habitGroups || []).filter(g => g.active === 'true' || g.active === true);
  const TYPES   = ['boolean', 'count', 'decimal', 'rating'];
  const idHint  = !draft.habit_id.startsWith('hab_') && draft.habit_id
    ? '⚠ Se recomienda que empiece por "hab_"'
    : null;

  return (
    <div className="ce-form">
      <div className="ce-form__grid">

        {/* habit_id — editable en create, readonly en edit */}
        <div className="ce-field ce-form__full">
          <label className={`ce-label${isCreate ? '' : ' ce-label--readonly'}`}>
            habit_id {isCreate ? '(editable antes de crear)' : '(no editable)'}
          </label>
          <input
            className={`ce-input${isCreate ? '' : ' ce-input--readonly'}`}
            value={draft.habit_id}
            readOnly={!isCreate}
            onChange={e => {
              setIdManuallyEdited(true);
              set('habit_id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            }}
            placeholder="hab_mi_habito"
          />
          {isCreate && idHint && (
            <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>{idHint}</span>
          )}
        </div>

        {/* Nombre — en create, auto-genera el ID */}
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

        {/* Tipo — editable en create, readonly en edit */}
        <div className="ce-field">
          <label className={`ce-label${isCreate ? '' : ' ce-label--readonly'}`}>
            Tipo {isCreate ? '' : '(solo lectura)'}
          </label>
          {isCreate ? (
            <select className="ce-select" value={draft.type}
              onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <input className="ce-input ce-input--readonly" value={draft.type} readOnly />
          )}
        </div>

        {/* Regla positiva */}
        <div className="ce-field">
          <label className="ce-label">Regla positiva *</label>
          <select className="ce-select" value={draft.positive_rule}
            onChange={e => set('positive_rule', e.target.value)}>
            {POSITIVE_RULES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Target + unit */}
        <div className="ce-field">
          <label className="ce-label">Valor objetivo</label>
          <input className="ce-input" type="number" step="any" value={draft.target_value}
            onChange={e => set('target_value', e.target.value)} placeholder="ej. 8" />
        </div>
        <div className="ce-field">
          <label className="ce-label">Unidad</label>
          <input className="ce-input" value={draft.unit}
            onChange={e => set('unit', e.target.value)} placeholder="ej. horas" />
        </div>

        {/* Score */}
        <div className="ce-field">
          <label className="ce-label">score_weight</label>
          <input className="ce-input" type="number" step="any" value={draft.score_weight}
            onChange={e => set('score_weight', e.target.value)} placeholder="ej. 2" />
        </div>
        <div className="ce-field">
          <label className="ce-label">sort_order</label>
          <input className="ce-input" type="number" step="1" value={draft.sort_order}
            onChange={e => set('sort_order', e.target.value)} placeholder="ej. 1" />
        </div>
        <div className="ce-field">
          <label className="ce-label">score_min</label>
          <input className="ce-input" type="number" step="any" value={draft.score_min}
            onChange={e => set('score_min', e.target.value)} placeholder="ej. -1" />
        </div>
        <div className="ce-field">
          <label className="ce-label">score_max</label>
          <input className="ce-input" type="number" step="any" value={draft.score_max}
            onChange={e => set('score_max', e.target.value)} placeholder="ej. 2" />
        </div>

        {/* Active / Visible */}
        <div className="ce-field">
          <label className="ce-label">Estado</label>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`active-${draft.habit_id || 'new'}`}
              checked={draft.active} onChange={e => set('active', e.target.checked)} />
            <label htmlFor={`active-${draft.habit_id || 'new'}`}>Activo</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`visible-${draft.habit_id || 'new'}`}
              checked={draft.visible} onChange={e => set('visible', e.target.checked)} />
            <label htmlFor={`visible-${draft.habit_id || 'new'}`}>Visible</label>
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
          {saving ? 'Guardando…' : isCreate ? 'Crear hábito' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Fila de hábito (edit) ─────────────────────────────────────────────────────

function HabitRow({ habit, config, onSaved }) {
  const [editing, setEditing] = useState(false);
  const isActive = habit.active === 'true' || habit.active === true;

  return (
    <div className="ce-item">
      {!editing && (
        <div className="ce-item__row">
          <div className="ce-item__info">
            <span className={`ce-item__name${!isActive ? ' ce-item__name--inactive' : ''}`}>
              {habit.name}
            </span>
            <span className="ce-item__meta">
              {habit.type} · {habit.positive_rule}
              {habit.score_weight ? ` · peso ${habit.score_weight}` : ''}
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
        <HabitForm
          habit={habit}
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

export function HabitConfigEditor({ config, onConfigUpdated }) {
  const [creating, setCreating] = useState(false);

  const groups  = (config.habitGroups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const habits  = config.habits || [];

  function handleSaved(record, isNew = false) {
    const newHabits = isNew
      ? [...habits, record]
      : habits.map(h => h.habit_id === record.habit_id ? record : h);
    onConfigUpdated({ ...config, habits: newHabits });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Botón crear */}
      {!creating && (
        <button type="button" className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setCreating(true)}>
          + Nuevo hábito
        </button>
      )}

      {/* Formulario de creación */}
      {creating && (
        <div className="ce-group">
          <div className="ce-group__header">Nuevo hábito</div>
          <HabitForm
            habit={{}}
            config={config}
            isCreate={true}
            onSaved={record => { handleSaved(record, true); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Lista agrupada */}
      {!groups.length && (
        <div className="ce-empty">No hay grupos de hábitos configurados en Google Sheets.</div>
      )}

      {groups.map(group => {
        const groupHabits = habits
          .filter(h => h.group_id === group.group_id)
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
        if (!groupHabits.length) return null;
        return (
          <div key={group.group_id} className="ce-group">
            <div className="ce-group__header">
              {group.emoji ? group.emoji + ' ' : ''}{group.name}
            </div>
            {groupHabits.map(habit => (
              <HabitRow key={habit.habit_id} habit={habit} config={config}
                onSaved={record => handleSaved(record, false)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
