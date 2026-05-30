/**
 * ConfigHealth.jsx
 *
 * Pantalla "Sistema": muestra el resultado de validar la configuración
 * cargada desde Google Sheets.
 *
 * No bloquea el uso de la app. Solo informa.
 * Los datos vienen de AppShell (sin peticiones nuevas).
 */

import '../../styles/config-health.css';
import { SyncStatus }          from './SyncStatus.jsx';
import { validateConfig, groupIssuesBySheet } from '../../domain/configValidation.js';
import { useMemo }             from 'react';

// ── Subcomponentes ────────────────────────────────────────────────────────────

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

// ── Componente principal ──────────────────────────────────────────────────────

export function ConfigHealth({ config, syncStatus, syncMessage, lastSync }) {
  const { issues, errorCount, warningCount } = useMemo(
    () => validateConfig(config),
    [config]
  );

  const grouped = useMemo(() => groupIssuesBySheet(issues), [issues]);

  // Orden de hojas en la UI (preferencia visual, no funcional)
  const SHEET_ORDER = [
    'CONFIG_HABIT_GROUPS',
    'CONFIG_HABITS',
    'CONFIG_ACTIVITY_GROUPS',
    'CONFIG_ACTIVITIES',
    'CONFIG_DAY_TYPES',
    'CONFIG_SCORE',
  ];

  const sortedSheets = Object.keys(grouped).sort((a, b) => {
    const ia = SHEET_ORDER.indexOf(a);
    const ib = SHEET_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const isLoading = config === null;
  const isClean   = !isLoading && errorCount === 0 && warningCount === 0;

  return (
    <div className="system-page">
      <header className="app-header">
        <span className="app-header__title">Sistema</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} />
      </header>

      <main className="system-main">

        {isLoading && (
          <div className="ch-loading">Cargando configuración…</div>
        )}

        {!isLoading && (
          <>
            {/* Resumen */}
            <div className="ch-summary">
              {isClean && (
                <span className="ch-summary__chip ch-summary__chip--ok">
                  ✓ Sin problemas
                </span>
              )}
              {errorCount > 0 && (
                <span className="ch-summary__chip ch-summary__chip--error">
                  ✕ {errorCount} error{errorCount > 1 ? 'es' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="ch-summary__chip ch-summary__chip--warning">
                  ! {warningCount} aviso{warningCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Estado limpio */}
            {isClean && (
              <div className="ch-clean">
                <span className="ch-clean__icon">✓</span>
                <span className="ch-clean__title">Configuración correcta</span>
                <span className="ch-clean__sub">
                  No se detectaron problemas en las hojas de configuración.
                </span>
              </div>
            )}

            {/* Bloques por hoja */}
            {sortedSheets.map(sheet => (
              <SheetBlock
                key={sheet}
                sheetName={sheet}
                issues={grouped[sheet]}
              />
            ))}

            {/* Nota informativa */}
            <p className="ch-info-note">
              La validación se ejecuta sobre los datos cargados desde Google Sheets.
              Corrige los problemas directamente en Sheets y recarga la app.
            </p>
          </>
        )}

      </main>
    </div>
  );
}
