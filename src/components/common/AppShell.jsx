/**
 * AppShell.jsx
 *
 * Componente raíz que gestiona:
 * - Carga inicial de datos desde Sheets (config + records + activities)
 * - Estado compartido entre pantallas (config, logs, sync)
 * - Navegación entre Hábitos, Actividades y Evolución
 *
 * TodayPage y ActivitiesPage reciben datos como props.
 * Ninguna de las dos páginas hace peticiones de red directamente
 * salvo para sus propias operaciones de escritura.
 */

import { useState, useEffect, useCallback } from 'react';
import '../../styles/activities.css';
import '../../styles/habits-dark.css';
import { TodayPage }      from '../today/TodayPage.jsx';
import { ActivitiesPage } from '../activities/ActivitiesPage.jsx';
import { EvolutionPage }  from '../evolution/EvolutionPage.jsx';
import '../../styles/evolution.css';
import { BottomNav }      from '../common/BottomNav.jsx';
import { ConfigHealth }   from '../common/ConfigHealth.jsx';
import '../../styles/config-health.css';
import { loadOnOpen, forceSync } from '../../services/syncService.js';
import { getLastSyncTime } from '../../services/localCache.js';

export function AppShell() {
  const [activeTab, setActiveTab] = useState('habits');

  // Estado global compartido
  const [config,          setConfig]          = useState(null);
  const [allDailyRecords, setAllDailyRecords] = useState([]);
  const [allHabitValues,  setAllHabitValues]  = useState([]);
  const [activityLog,     setActivityLog]     = useState([]);

  // Sync
  const [syncStatus,  setSyncStatus]  = useState('checking');
  const [syncMessage, setSyncMessage] = useState('Conectando…');
  const [lastSync,    setLastSync]    = useState(getLastSyncTime());
  const [replacedWarning, setReplacedWarning] = useState(false);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ── Procesar datos recibidos (caché o Sheets) ─────────────────────────────

  const applyData = useCallback((data) => {
    const c = data.config || {};
    setConfig({
      habits:          c.habits          || [],
      habitGroups:     c.habitGroups     || [],
      dayTypes:        c.dayTypes        || [],
      scoreRules:      c.scoreRules      || [],
      activities:      c.activities      || [],
      activityGroups:  c.activityGroups  || [],
    });
    setAllDailyRecords(data.dailyRecords     || []);
    setAllHabitValues( data.dailyHabitValues || []);
    setActivityLog(    data.activityLog      || []);
  }, []);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadOnOpen(
      (cached) => {
        applyData(cached);
        setSyncStatus('checking');
        setSyncMessage('Actualizando…');
      },
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
  }, [applyData]);

  // ── Callbacks de escritura ─────────────────────────────────────────────────

  /**
   * Llamado por TodayPage cuando el guardado en Sheets fue exitoso.
   * Actualiza registros diarios y hábitos en memoria.
   */
  function handleDailySaved({ date, dayTypeId, note, scoreDay, habitValuesArray }) {
    setAllDailyRecords(prev => {
      const others = prev.filter(r => r.date !== date);
      return [...others, {
        date,
        day_type_id: dayTypeId,
        note,
        score_day:   scoreDay,
        score_week:  '',
        score_month: '',
        updated_at:  new Date().toISOString(),
        updated_by:  'app',
      }];
    });
    setAllHabitValues(prev => {
      const others = prev.filter(hv => hv.date !== date);
      return [...others, ...habitValuesArray];
    });
    setSyncStatus('ok');
    setSyncMessage('Guardado');
    setLastSync(new Date().toISOString());
  }

  /**
   * Llamado por ActivitiesPage cuando se guarda o edita una actividad.
   * Upsert por activity_log_id:
   *   - Si el ID ya existe en memoria → reemplaza el registro (edición).
   *   - Si no existe → añade al final (nuevo registro).
   * Así la lista en pantalla refleja el estado real inmediatamente.
   */
  function handleActivityLogged(payload) {
    const now = new Date().toISOString();

    setActivityLog(prev => {
      const exists = prev.some(
        item => item.activity_log_id === payload.activity_log_id
      );

      const updated = {
        activity_log_id: payload.activity_log_id,
        date:            payload.date,
        activity_id:     payload.activity_id,
        duration_min:    String(payload.duration_min ?? ''),
        distance_km:     String(payload.distance_km  ?? ''),
        comment:         payload.comment || '',
        // created_at: conservar si ya existía; si es nuevo, usar ahora
        created_at: exists
          ? (prev.find(i => i.activity_log_id === payload.activity_log_id)?.created_at || now)
          : now,
        updated_at:  now,
        updated_by:  'app',
      };

      if (exists) {
        return prev.map(item =>
          item.activity_log_id === payload.activity_log_id ? updated : item
        );
      }
      return [...prev, updated];
    });

    setSyncStatus('ok');
    setSyncMessage('Actividad guardada');
    setLastSync(now);
  }

  /**
   * Llamado por ConfigHealth cuando se guarda configuración exitosamente.
   * Actualiza el config en memoria para que la UI refleje los cambios
   * sin necesidad de recargar desde Sheets.
   * La próxima carga desde Sheets reemplazará esto (Sheets manda siempre).
   */
  /**
   * Refresca todos los datos desde Google Sheets (pull only).
   * No envía nada. No modifica registros.
   * Si hay cambios sin guardar en Hábitos, avisa y no refresca.
   */
  async function handleRefresh() {
    if (hasUnsavedChanges) {
      setSyncMessage('Hay cambios sin guardar. Guarda antes de refrescar.');
      setSyncStatus('pending');
      return;
    }

    setIsRefreshing(true);
    setSyncStatus('checking');
    setSyncMessage('Actualizando…');

    const result = await forceSync();

    if (result.ok) {
      applyData(result.data);
      setSyncStatus('ok');
      setSyncMessage('Datos actualizados desde Google Sheets');
      setLastSync(new Date().toISOString());
      setReplacedWarning(true);
      setTimeout(() => {
        setReplacedWarning(false);
        setSyncMessage('Sincronizado');
      }, 3500);
    } else {
      setSyncStatus('error');
      setSyncMessage(result.error || 'Error al conectar con Google Sheets');
    }

    setIsRefreshing(false);
  }

  function handleConfigUpdated(updatedConfig) {
    setConfig(updatedConfig);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const syncProps = { syncStatus, syncMessage, lastSync, replacedWarning, onRefresh: handleRefresh, isRefreshing };

  return (
    <div className="app-shell">
      {activeTab === 'habits' && (
        <TodayPage
          config={config}
          allDailyRecords={allDailyRecords}
          allHabitValues={allHabitValues}
          onDailySaved={handleDailySaved}
          onUnsavedChanges={setHasUnsavedChanges}
          {...syncProps}
        />
      )}

      {activeTab === 'activities' && (
        <ActivitiesPage
          config={config}
          activityLog={activityLog}
          onActivityLogged={handleActivityLogged}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          lastSync={lastSync}
        />
      )}

      {activeTab === 'evolution' && (
        <EvolutionPage
          config={config}
          allDailyRecords={allDailyRecords}
          allHabitValues={allHabitValues}
          activityLog={activityLog}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          lastSync={lastSync}
        />
      )}

      {activeTab === 'system' && (
        <ConfigHealth
          config={config}
          onConfigUpdated={handleConfigUpdated}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          lastSync={lastSync}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
