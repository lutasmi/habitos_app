/**
 * ActivitiesPage.jsx
 *
 * Pantalla de registro de actividades (Fase 3).
 *
 * Flujo:
 * 1. Recibe config y logs del estado global (AppShell).
 * 2. El usuario selecciona una actividad y rellena el formulario.
 * 3. onSaveLog genera activity_log_id en cliente y llama a saveActivityToSheets.
 * 4. Si ok: actualiza la lista local de logs. Si error: muestra banner.
 *
 * La pantalla NO tiene su propio ciclo de carga — los datos vienen del
 * padre (AppShell) que ya sincronizó con Sheets al abrir.
 */

import { useState } from 'react';
import { SyncStatus }      from '../common/SyncStatus.jsx';
import { DateSelector }    from '../today/DateSelector.jsx';
import { ActivityGroup }   from './ActivityGroup.jsx';
import { groupActivities } from '../../domain/activities.js';
import { saveActivityToSheets } from '../../services/syncService.js';
import { getTodayDateKey } from '../../domain/dates.js';

export function ActivitiesPage({ config, activityLog, onActivityLogged, syncStatus, syncMessage, lastSync, onRefresh, isRefreshing }) {
  const [date,      setDate]      = useState(getTodayDateKey());
  const [isSaving,  setIsSaving]  = useState(false);
  const [saveError, setSaveError] = useState(null);

  const groupedActivities = config
    ? groupActivities(config.activities || [], config.activityGroups || [])
    : [];

  const hasNoConfig =
    config !== null &&
    config !== undefined &&
    (config.activityGroups || []).length === 0;

  async function handleSaveLog(payload, onSuccess) {
    setIsSaving(true);
    setSaveError(null);

    const result = await saveActivityToSheets(payload);

    if (result.ok) {
      // Notifica al padre para que actualice el log en memoria
      onActivityLogged(payload);
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      setSaveError(result.error || 'Error al guardar. Inténtalo de nuevo.');
    }

    setIsSaving(false);
  }

  return (
    <div className="today-page"> {/* reutiliza layout de TodayPage */}

      {/* Cabecera */}
      <header className="app-header">
        <span className="app-header__title">Actividades</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} onRefresh={onRefresh} isRefreshing={isRefreshing} />
      </header>

      {/* Error de guardado */}
      {saveError && (
        <div className="banner banner--error">⚠ {saveError}</div>
      )}

      <main className="today-main">

        <DateSelector date={date} onChange={setDate} />

        {/* Sin configuración */}
        {config === null && (
          <div className="card today-loading">
            <span className="text-muted">Cargando actividades…</span>
          </div>
        )}

        {hasNoConfig && (
          <div className="card today-empty">
            <p>No hay actividades configuradas en Google Sheets.</p>
            <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
              Añade filas en <code>CONFIG_ACTIVITY_GROUPS</code> y{' '}
              <code>CONFIG_ACTIVITIES</code> para empezar.
            </p>
          </div>
        )}

        {groupedActivities.map(group => (
          <ActivityGroup
            key={group.group_id}
            group={group}
            logsAll={activityLog}
            date={date}
            onSaveLog={handleSaveLog}
            isSaving={isSaving}
          />
        ))}

        <div style={{ height: 24 }} />

      </main>
    </div>
  );
}
