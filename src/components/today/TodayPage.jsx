/**
 * TodayPage.jsx
 *
 * Pantalla principal de la app: registro diario de hábitos.
 *
 * Flujo:
 * 1. Al montar: carga caché → luego lee Sheets → si Sheets responde, reemplaza.
 * 2. Al cambiar fecha: rellena hábitos desde los datos en memoria.
 * 3. Al modificar hábito: actualiza estado local, recalcula score, marca cambios pendientes.
 * 4. Al pulsar Guardar: envía payload a Sheets. Si falla, mantiene cambios pendientes.
 */

import { useState, useEffect, useCallback } from 'react';
import { FloatingSaveButton } from '../common/FloatingSaveButton.jsx';
import { SyncStatus } from '../common/SyncStatus.jsx';
import { DateSelector } from './DateSelector.jsx';
import { DayTypeSelector } from './DayTypeSelector.jsx';
import { DailyNote } from './DailyNote.jsx';
import { HabitGroup } from './HabitGroup.jsx';
import { TodayScore } from './TodayScore.jsx';
import { loadOnOpen, saveDailyToSheets } from '../../services/syncService.js';
import { getLastSyncTime } from '../../services/localCache.js';
import { todayString } from '../../domain/dates.js';
import { groupHabits } from '../../domain/habits.js';
import { calculateDayScore, calculateHabitScore } from '../../domain/scoring.js';

// ---- Estado inicial vacío para un día ----------------------------------------

function emptyDayState() {
  return { dayTypeId: '', note: '', habitValues: {} };
}

// ---- Extrae el estado de un día desde los datos de Sheets --------------------

function buildDayState(date, dailyRecords, dailyHabitValues) {
  const record = (dailyRecords || []).find(r => r.date === date);
  const hvForDate = (dailyHabitValues || []).filter(hv => hv.date === date);

  const habitValues = {};
  hvForDate.forEach(hv => {
    habitValues[hv.habit_id] = hv;
  });

  return {
    dayTypeId: record?.day_type_id || '',
    note: record?.note || '',
    habitValues,
  };
}

// ---- Componente principal ----------------------------------------------------

export function TodayPage() {
  // Datos de configuración (vienen de Sheets)
  const [config, setConfig] = useState(null); // { habits, habitGroups, dayTypes, scoreRules }

  // Registros históricos en memoria
  const [allDailyRecords, setAllDailyRecords] = useState([]);
  const [allHabitValues, setAllHabitValues] = useState([]);

  // Estado de la fecha y día actual
  const [date, setDate] = useState(todayString());
  const [dayState, setDayState] = useState(emptyDayState());

  // Sync
  const [syncStatus, setSyncStatus] = useState('checking');
  const [syncMessage, setSyncMessage] = useState('Conectando…');
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [replacedWarning, setReplacedWarning] = useState(false);

  // Guardado
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ---- Aplicar datos al cambiar fecha ----------------------------------------

  const applyDataForDate = useCallback((d, records, habitVals) => {
    const state = buildDayState(d, records, habitVals);
    setDayState(state);
  }, []);

  // ---- Procesar datos recibidos (caché o Sheets) ------------------------------

  function applyData(data) {
    const c = data.config || {};
    setConfig({
      habits: c.habits || [],
      habitGroups: c.habitGroups || [],
      dayTypes: c.dayTypes || [],
      scoreRules: c.scoreRules || [],
    });
    setAllDailyRecords(data.dailyRecords || []);
    setAllHabitValues(data.dailyHabitValues || []);
  }

  // ---- Carga inicial ----------------------------------------------------------

  useEffect(() => {
    loadOnOpen(
      // Callback 1: datos de caché disponibles inmediatamente
      (cached) => {
        applyData(cached);
        setSyncStatus('checking');
        setSyncMessage('Actualizando…');
      },
      // Callback 2: respuesta de Sheets
      (result) => {
        if (result.ok) {
          applyData(result.data);
          setSyncStatus('ok');
          setSyncMessage('Sincronizado');
          setLastSync(getLastSyncTime());
          if (result.replacedLocalData) {
            setReplacedWarning(true);
            setTimeout(() => setReplacedWarning(false), 4000);
          }
        } else {
          setSyncStatus('error');
          setSyncMessage('Sin conexión con Sheets');
        }
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Rellenar datos cuando cambia la fecha o los datos ---------------------

  useEffect(() => {
    applyDataForDate(date, allDailyRecords, allHabitValues);
    setHasUnsavedChanges(false);
    setSaveError(null);
  }, [date, allDailyRecords, allHabitValues, applyDataForDate]);

  // ---- Cambio de hábito -------------------------------------------------------

  function handleHabitChange(habitId, newHabitValue) {
    setDayState(prev => ({
      ...prev,
      habitValues: {
        ...prev.habitValues,
        [habitId]: { ...newHabitValue, date },
      },
    }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }

  // ---- Cambio de tipo de día --------------------------------------------------

  function handleDayTypeChange(val) {
    setDayState(prev => ({ ...prev, dayTypeId: val }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }

  // ---- Cambio de nota ---------------------------------------------------------

  function handleNoteChange(val) {
    setDayState(prev => ({ ...prev, note: val }));
    setHasUnsavedChanges(true);
    setSaveError(null);
  }

  // ---- Score calculado en tiempo real ----------------------------------------

  const activeHabits = config
    ? (config.habits || []).filter(
        h => (h.active === 'true' || h.active === true) &&
             (h.visible === 'true' || h.visible === true)
      )
    : [];

  const scoreDay = calculateDayScore(
    activeHabits,
    Object.values(dayState.habitValues)
  );

  // ---- Guardar ---------------------------------------------------------------

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const habitValuesArray = Object.values(dayState.habitValues).map(hv => ({
      date,
      habit_id: hv.habit_id,
      value: String(hv.value ?? ''),
      status: hv.status || 'empty',
      score_value: hv.score_value ?? 0,
    }));

    const payload = {
      date,
      day_type_id: dayState.dayTypeId,
      note: dayState.note,
      habitValues: habitValuesArray,
      score_day: scoreDay,
      score_week: '',
      score_month: '',
    };

    const result = await saveDailyToSheets(payload);

    if (result.ok) {
      // Actualizar registros en memoria para que el cambio de fecha sea coherente
      setAllDailyRecords(prev => {
        const others = prev.filter(r => r.date !== date);
        return [...others, {
          date,
          day_type_id: dayState.dayTypeId,
          note: dayState.note,
          score_day: scoreDay,
          score_week: '',
          score_month: '',
          updated_at: new Date().toISOString(),
          updated_by: 'app',
        }];
      });
      setAllHabitValues(prev => {
        const others = prev.filter(hv => hv.date !== date);
        return [...others, ...habitValuesArray];
      });
      setHasUnsavedChanges(false);
      setSyncStatus('ok');
      setSyncMessage('Guardado');
      setLastSync(new Date().toISOString());
    } else {
      setSaveError(result.error || 'Error al guardar. Inténtalo de nuevo.');
      setSyncStatus('error');
      setSyncMessage('Error al guardar');
    }

    setIsSaving(false);
  }

  // ---- Grupos de hábitos -------------------------------------------------------

  const groupedHabits = config
    ? groupHabits(config.habits, config.habitGroups)
    : [];

  const hasNoConfig = config !== null && config.habitGroups.length === 0;

  // ---- Render -----------------------------------------------------------------

  return (
    <div className="today-page">

      {/* Cabecera */}
      <header className="app-header">
        <span className="app-header__title">Hábitos</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} />
      </header>

      {/* Aviso: Sheets reemplazó datos locales */}
      {replacedWarning && (
        <div className="banner banner--info">
          ↓ Datos actualizados desde Google Sheets
        </div>
      )}

      {/* Error de guardado */}
      {saveError && (
        <div className="banner banner--error">
          ⚠ {saveError}
        </div>
      )}

      <main className="today-main">

        {/* Selector de fecha */}
        <DateSelector date={date} onChange={setDate} />

        {/* Score del día */}
        <TodayScore score={scoreDay} scoreRules={config?.scoreRules || []} />

        {/* Tipo de día + nota */}
        <div className="card today-meta">
          <DayTypeSelector
            dayTypes={config?.dayTypes || []}
            value={dayState.dayTypeId}
            onChange={handleDayTypeChange}
          />
          <DailyNote value={dayState.note} onChange={handleNoteChange} />
        </div>

        {/* Hábitos */}
        {config === null && (
          <div className="card today-loading">
            <span className="text-muted">Cargando hábitos…</span>
          </div>
        )}

        {hasNoConfig && (
          <div className="card today-empty">
            <p>No hay hábitos configurados en Google Sheets.</p>
            <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
              Añade filas en las hojas <code>CONFIG_HABIT_GROUPS</code> y{' '}
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

        {/* Espacio para el botón flotante */}
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
