/**
 * SyncStatus.jsx
 *
 * Indicador visual del estado de sincronización.
 * Opcionalmente muestra un botón de refresco manual.
 *
 * Props:
 *   status       — 'ok' | 'error' | 'pending' | 'checking'
 *   message      — texto override del estado
 *   lastSync     — ISO string del último sync exitoso
 *   onRefresh    — callback para refrescar desde Sheets (opcional)
 *   isRefreshing — true mientras el refresh está en curso
 */

const STATUS_CONFIG = {
  ok:       { dotClass: 'sync-dot--ok',       label: 'Sincronizado' },
  error:    { dotClass: 'sync-dot--error',     label: 'Sin conexión' },
  pending:  { dotClass: 'sync-dot--pending',   label: 'Cambios sin guardar' },
  checking: { dotClass: 'sync-dot--checking',  label: 'Verificando…' },
};

export function SyncStatus({ status = 'checking', message, lastSync, onRefresh, isRefreshing }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.checking;
  const lastSyncLabel = lastSync
    ? `Sync ${new Date(lastSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className="sync-status">
      <span className={`sync-dot ${config.dotClass}`} />
      <span className="text-muted">
        {message || config.label}
        {lastSyncLabel && ` · ${lastSyncLabel}`}
      </span>

      {onRefresh && (
        <button
          type="button"
          className={`sync-refresh-btn${isRefreshing ? ' sync-refresh-btn--spinning' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? 'Actualizando…' : 'Refrescar desde Google Sheets'}
          title={isRefreshing ? 'Actualizando…' : 'Refrescar desde Google Sheets'}
        >
          ↻
        </button>
      )}
    </div>
  );
}
