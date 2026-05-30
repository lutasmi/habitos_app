/**
 * ConfigHealth.jsx
 *
 * Pantalla "Sistema" con tres tabs internas:
 *   Salud     → validación de configuración (comportamiento original)
 *   Hábitos   → editor de CONFIG_HABITS
 *   Actividades → editor de CONFIG_ACTIVITIES
 *
 * No bloquea el uso de la app. Solo informa y permite editar.
 */

import { useState, useMemo } from 'react';
import '../../styles/config-health.css';
import '../../styles/config-editor.css';
import { SyncStatus }             from './SyncStatus.jsx';
import { validateConfig, groupIssuesBySheet } from '../../domain/configValidation.js';
import { HabitConfigEditor }      from '../system/HabitConfigEditor.jsx';
import { ActivityConfigEditor }   from '../system/ActivityConfigEditor.jsx';

// ── Subcomponentes de Salud ───────────────────────────────────────────────────

function IssueIcon({ severity }) {
  return (
    <span className={`ch-issue__icon ch-issue__icon--${severity}`}>
      {severity === 'error' ? '✕' : '!'}
    </span>
  );
}

function SheetBlock({ sheetName, issues }) {
  const errors   = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return (
    <div className="ch-sheet-block">
      <div className="ch-sheet-block__header">
        <span className="ch-sheet-block__name">{sheetName}</span>
        <div className="ch-sheet-block__counts">
          {errors   > 0 && <span className="ch-badge ch-badge--error">{errors} error{errors > 1 ? 'es' : ''}</span>}
          {warnings > 0 && <span className="ch-badge ch-badge--warning">{warnings} aviso{warnings > 1 ? 's' : ''}</span>}
        </div>
      </div>
      <ul className="ch-issue-list">
        {issues.map((issue, i) => (
          <li key={i} className="ch-issue">
            <IssueIcon severity={issue.severity} />
            <div className="ch-issue__body">
              <span className="ch-issue__message">{issue.message}</span>
              {issue.entityId && (
                <span className="ch-issue__meta">ID: {issue.entityId} · {issue.code}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Tab: Salud ────────────────────────────────────────────────────────────────

function HealthTab({ config }) {
  const { issues, errorCount, warningCount } = useMemo(
    () => validateConfig(config),
    [config]
  );
  const grouped = useMemo(() => groupIssuesBySheet(issues), [issues]);

  const SHEET_ORDER = [
    'CONFIG_HABIT_GROUPS', 'CONFIG_HABITS',
    'CONFIG_ACTIVITY_GROUPS', 'CONFIG_ACTIVITIES',
    'CONFIG_DAY_TYPES', 'CONFIG_SCORE',
  ];

  const sortedSheets = Object.keys(grouped).sort((a, b) => {
    const ia = SHEET_ORDER.indexOf(a), ib = SHEET_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const isClean = errorCount === 0 && warningCount === 0;

  return (
    <>
      <div className="ch-summary">
        {isClean && <span className="ch-summary__chip ch-summary__chip--ok">✓ Sin problemas</span>}
        {errorCount   > 0 && <span className="ch-summary__chip ch-summary__chip--error">✕ {errorCount} error{errorCount > 1 ? 'es' : ''}</span>}
        {warningCount > 0 && <span className="ch-summary__chip ch-summary__chip--warning">! {warningCount} aviso{warningCount > 1 ? 's' : ''}</span>}
      </div>

      {isClean && (
        <div className="ch-clean">
          <span className="ch-clean__icon">✓</span>
          <span className="ch-clean__title">Configuración correcta</span>
          <span className="ch-clean__sub">No se detectaron problemas en las hojas de configuración.</span>
        </div>
      )}

      {sortedSheets.map(sheet => (
        <SheetBlock key={sheet} sheetName={sheet} issues={grouped[sheet]} />
      ))}

      <p className="ch-info-note">
        La validación se ejecuta sobre los datos cargados desde Google Sheets.
        Corrige los problemas directamente en Sheets y recarga la app, o usa las
        tabs Hábitos y Actividades para editar desde aquí.
      </p>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ConfigHealth({
  config,
  onConfigUpdated,
  syncStatus,
  syncMessage,
  lastSync,
}) {
  const [tab, setTab] = useState('health');
  const isLoading = config === null;

  return (
    <div className="system-page">
      <header className="app-header">
        <span className="app-header__title">Sistema</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} />
      </header>

      <main className="system-main">
        {isLoading && <div className="ch-loading">Cargando configuración…</div>}

        {!isLoading && (
          <>
            {/* Tabs internas */}
            <div className="sys-tabs">
              <button className={`sys-tab${tab === 'health'      ? ' sys-tab--active' : ''}`}
                onClick={() => setTab('health')}>Salud</button>
              <button className={`sys-tab${tab === 'habits'      ? ' sys-tab--active' : ''}`}
                onClick={() => setTab('habits')}>Hábitos</button>
              <button className={`sys-tab${tab === 'activities'  ? ' sys-tab--active' : ''}`}
                onClick={() => setTab('activities')}>Actividades</button>
            </div>

            {tab === 'health' && <HealthTab config={config} />}

            {tab === 'habits' && (
              <HabitConfigEditor config={config} onConfigUpdated={onConfigUpdated} />
            )}

            {tab === 'activities' && (
              <ActivityConfigEditor config={config} onConfigUpdated={onConfigUpdated} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
