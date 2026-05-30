/**
 * HabitConfigEditor.jsx
 *
 * Lista de hábitos agrupados por grupo con editor inline.
 * Campos editables según Fase 6.1.
 * habit_id: solo lectura (nunca editable, conserva histórico).
 * type: solo lectura en Fase 6.1.
 */

import { useState } from 'react';
import { saveConfigToSheets } from '../../services/syncService.js';

const POSITIVE_RULES = ['yes_is_good', 'no_is_good', 'greater_equal_target', 'lower_equal_target'];

// ── Validación local del formulario ──────────────────────────────────────────

function validateHabitForm(draft, config) {
  const groupIds = new Set((config.habitGroups || []).map(g => g.group_id));
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

// ── Formulario inline ────────────────────────────────────────────────────────

function HabitForm({ habit, config, onSaved, onCancel }) {
  const [draft, setDraft]     = useState({
    name:           habit.name          || '',
    description:    habit.description   || '',
    group_id:       habit.group_id      || '',
    target_value:   habit.target_value  || '',
    unit:           habit.unit          || '',
    positive_rule:  habit.positive_rule || 'yes_is_good',
    score_weight:   habit.score_weight  || '',
    score_min:      habit.score_min     || '',
    score_max:      habit.score_max     || '',
    sort_order:     habit.sort_order    || '',
    active:         habit.active === 'true' || habit.active === true,
    visible:        habit.visible === 'true' || habit.visible === true,
  });
  const [saving,   setSaving]  = useState(false);
  const [saveMsg,  setSaveMsg] = useState(null);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  async function handleSave() {
    const err = validateHabitForm(draft, config);
    if (err) { setSaveMsg({ ok: false, text: err }); return; }

    setSaving(true);
    setSaveMsg(null);

    const now = new Date().toISOString();
    const record = {
      ...habit,            // conserva todos los campos originales (incluido habit_id)
      name:          draft.name.trim(),
      description:   draft.description.trim(),
      group_id:      draft.group_id,
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

  const groups = (config.habitGroups || []).filter(
    g => g.active === 'true' || g.active === true
  );

  return (
    <div className="ce-form">
      <div className="ce-form__grid">

        {/* ID — solo lectura */}
        <div className="ce-field">
          <label className="ce-label ce-label--readonly">habit_id (no editable)</label>
          <input className="ce-input ce-input--readonly" value={habit.habit_id} readOnly />
        </div>

        {/* Tipo — solo lectura Fase 6.1 */}
        <div className="ce-field">
          <label className="ce-label ce-label--readonly">type (solo lectura)</label>
          <input className="ce-input ce-input--readonly" value={habit.type || ''} readOnly />
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

        {/* Regla positiva */}
        <div className="ce-field ce-form__full">
          <label className="ce-label">Regla positiva *</label>
          <select className="ce-select" value={draft.positive_rule} onChange={e => set('positive_rule', e.target.value)}>
            {POSITIVE_RULES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Target value + unit */}
        <div className="ce-field">
          <label className="ce-label">Valor objetivo</label>
          <input className="ce-input" type="number" step="any" value={draft.target_value}
            onChange={e => set('target_value', e.target.value)} placeholder="ej. 8" />
        </div>
        <div className="ce-field">
          <label className="ce-label">Unidad</label>
          <input className="ce-input" value={draft.unit} onChange={e => set('unit', e.target.value)} placeholder="ej. horas" />
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
            <input type="checkbox" id={`active-${habit.habit_id}`} checked={draft.active}
              onChange={e => set('active', e.target.checked)} />
            <label htmlFor={`active-${habit.habit_id}`}>Activo</label>
          </div>
          <div className="ce-checkbox-row">
            <input type="checkbox" id={`visible-${habit.habit_id}`} checked={draft.visible}
              onChange={e => set('visible', e.target.checked)} />
            <label htmlFor={`visible-${habit.habit_id}`}>Visible</label>
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

// ── Fila de hábito ───────────────────────────────────────────────────────────

function HabitRow({ habit, config, onSaved }) {
  const [editing, setEditing] = useState(false);

  const isActive = habit.active === 'true' || habit.active === true;

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
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function HabitConfigEditor({ config, onConfigUpdated }) {
  const groups = (config.habitGroups || [])
    .filter(g => g.active === 'true' || g.active === true)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  const habits = config.habits || [];

  if (!groups.length) {
    return (
      <div className="ce-empty">
        No hay grupos de hábitos configurados en Google Sheets.
      </div>
    );
  }

  function handleSaved(updatedHabit) {
    // Actualiza el hábito en memoria para reflejar el cambio inmediatamente
    const newHabits = habits.map(h =>
      h.habit_id === updatedHabit.habit_id ? updatedHabit : h
    );
    onConfigUpdated({ ...config, habits: newHabits });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <HabitRow
                key={habit.habit_id}
                habit={habit}
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
