/**
 * TodayPage.jsx
 *
 * Pantalla de registro diario de hábitos.
 *
 * FASE 3: Ya no gestiona carga de datos propia.
 * Recibe config, records y habitValues como props desde AppShell,
 * que es el único punto de carga y sincronización global.
 *
 * Sigue gestionando localmente:
 * - La fecha seleccionada
 * - El estado del día (tipo, nota, valores de hábitos)
 * - El guardado manual (FloatingSaveButton)
 */

import { useState, useEffect, useCallback } from 'react';
import { FloatingSaveButton } from '../common/FloatingSaveButton.jsx';
import { SyncStatus }         from '../common/SyncStatus.jsx';
import { DateSelector }       from './DateSelector.jsx';
import { DayTypeSelector }    from './DayTypeSelector.jsx';
import { DailyNote }          from './DailyNote.jsx';
import { HabitGroup }         from './HabitGroup.jsx';
import { TodayScore }         from './TodayScore.jsx';
import { saveDailyToSheets }  from '../../services/syncService.js';
import { getTodayDateKey }    from '../../domain/dates.js';
import { groupHabits }        from '../../domain/habits.js';
import { calculateDayScore }  from '../../domain/scoring.js';

// ── Estado vacío de un día ────────────────────────────────────────────────

function emptyDayState() {
  return { dayTypeId: '', note: '', habitValues: {} };
}

function buildDayState(date, dailyRecords, dailyHabitValues) {
  const record    = (dailyRecords     || []).find(r  => r.date === date);
  const hvForDate = (dailyHabitValues || []).filter(hv => hv.date === date);

  const habitValues = {};
  hvForDate.forEach(hv => { habitValues[hv.habit_id] = hv; });

  return {
    dayTypeId:   record?.day_type_id || '',
    note:        record?.note        || '',
    habitValues,
  };
}

// ── Componente ────────────────────────────────────────────────────────────

export function TodayPage({
  config,
  allDailyRecords,
  allHabitValues,
  onDailySaved,
  onUnsavedChanges,
  syncStatus,
  syncMessage,
  lastSync,
  replacedWarning,
  onRefresh,
  isRefreshing,
}) {
  const [date,     setDate]     = useState(getTodayDateKey());
  const [dayState, setDayState] = useState(emptyDayState());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving,          setIsSaving]           = useState(false);
  const [saveError,         setSaveError]          = useState(null);

  // ── Rellenar datos al cambiar fecha o datos externos ─────────────────────

  const applyDataForDate = useCallback((d, records, hvs) => {
    setDayState(buildDayState(d, records, hvs));
  }, []);

  useEffect(() => {
    applyDataForDate(date, allDailyRecords, allHabitValues);
    setHasUnsavedChanges(false);
    onUnsavedChanges?.(false);
    setSaveError(null);
  }, [date, allDailyRecords, allHabitValues, applyDataForDate]);

  // ── Cambios locales ───────────────────────────────────────────────────────

  function handleHabitChange(habitId, newHabitValue) {
    setDayState(prev => ({
      ...prev,
      habitValues: { ...prev.habitValues, [habitId]: { ...newHabitValue, date } },
    }));
    setHasUnsavedChanges(true);
    onUnsavedChanges?.(true);
    setSaveError(null);
  }

  function handleDayTypeChange(val) {
    setDayState(prev => ({ ...prev, dayTypeId: val }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }

  function handleNoteChange(val) {
    setDayState(prev => ({ ...prev, note: val }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }

  // ── Score en tiempo real ──────────────────────────────────────────────────

  const activeHabits = (config?.habits || []).filter(
    h => (h.active === 'true' || h.active === true) &&
         (h.visible === 'true' || h.visible === true)
  );

  const scoreDay = calculateDayScore(activeHabits, Object.values(dayState.habitValues));

  // ── Guardado ──────────────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const habitValuesArray = Object.values(dayState.habitValues).map(hv => ({
      date,
      habit_id:    hv.habit_id,
      value:       String(hv.value ?? ''),
      status:      hv.status       || 'empty',
      score_value: hv.score_value  ?? 0,
    }));

    const payload = {
      date,
      day_type_id: dayState.dayTypeId,
      note:        dayState.note,
      habitValues: habitValuesArray,
      score_day:   scoreDay,
      score_week:  '',
      score_month: '',
    };

    const result = await saveDailyToSheets(payload);

    if (result.ok) {
      setHasUnsavedChanges(false);
      onUnsavedChanges?.(false);
      onDailySaved?.({
        date,
        dayTypeId:        dayState.dayTypeId,
        note:             dayState.note,
        scoreDay,
        habitValuesArray,
      });
    } else {
      setSaveError(result.error || 'Error al guardar. Inténtalo de nuevo.');
    }

    setIsSaving(false);
  }

  // ── Agrupación ────────────────────────────────────────────────────────────

  const groupedHabits = config
    ? groupHabits(config.habits, config.habitGroups)
    : [];

  const hasNoConfig = config !== null && (config?.habitGroups || []).length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="today-page">

      <header className="app-header">
        <span className="app-header__title">Hábitos</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} onRefresh={onRefresh} isRefreshing={isRefreshing} />
      </header>

      {replacedWarning && (
        <div className="banner banner--info">
          ↓ Datos actualizados desde Google Sheets
        </div>
      )}

      {saveError && (
        <div className="banner banner--error">⚠ {saveError}</div>
      )}

      <main className="today-main">
        <DateSelector date={date} onChange={setDate} />
        <TodayScore score={scoreDay} scoreRules={config?.scoreRules || []} />

        <div className="card today-meta">
          <DayTypeSelector
            dayTypes={config?.dayTypes || []}
            value={dayState.dayTypeId}
            onChange={handleDayTypeChange}
          />
          <DailyNote value={dayState.note} onChange={handleNoteChange} />
        </div>

        {config === null && (
          <div className="card today-loading">
            <span className="text-muted">Cargando hábitos…</span>
          </div>
        )}

        {hasNoConfig && (
          <div className="card today-empty">
            <p>No hay hábitos configurados en Google Sheets.</p>
            <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
              Añade filas en <code>CONFIG_HABIT_GROUPS</code> y{' '}
              <code>CONFIG_HABITS</code> para empezar.
            </p>
          </div>
        )}

        {groupedHabits.map(group => (
          <HabitGroup
            key={group.group_id}
            group={group}
            habitValues={dayState.habitValues}
            onHabitChange={handleHabitChange}
          />
        ))}

        <div style={{ height: 80 }} />
      </main>

      <FloatingSaveButton
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
}
