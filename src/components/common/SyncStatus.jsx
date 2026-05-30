/**
 * SyncStatus.jsx
 *
 * Indicador visual del estado de sincronización con Google Sheets.
 */

const STATUS_CONFIG = {
  ok:       { dotClass: 'sync-dot--ok',       label: 'Conectado' },
  error:    { dotClass: 'sync-dot--error',     label: 'Sin conexión' },
  pending:  { dotClass: 'sync-dot--pending',   label: 'Cambios sin guardar' },
  checking: { dotClass: 'sync-dot--checking',  label: 'Verificando…' },
};

/**
 * @param {object} props
 * @param {'ok'|'error'|'pending'|'checking'} props.status
 * @param {string} [props.message] - Mensaje adicional opcional
 * @param {string} [props.lastSync] - ISO string del último sync exitoso
 */
export function SyncStatus({ status = 'checking', message, lastSync }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  const lastSyncLabel = lastSync
    ? `Último sync: ${new Date(lastSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className="sync-status">
      <span className={`sync-dot ${config.dotClass}`} />
      <span className="text-muted">
        {message || config.label}
        {lastSyncLabel && ` · ${lastSyncLabel}`}
      </span>
    </div>
  );
}
