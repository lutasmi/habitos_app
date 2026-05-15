/**
 * FloatingSaveButton.jsx
 *
 * Botón flotante de guardado manual. Siempre visible.
 * Regla de producto: el guardado es siempre manual, nunca automático.
 */

export function FloatingSaveButton({ onSave, isSaving = false, hasUnsavedChanges = false }) {
  const label = isSaving ? 'Guardando…' : hasUnsavedChanges ? '💾 Guardar' : '✓ Guardado';

  return (
    <button
      className="floating-save-btn"
      onClick={onSave}
      disabled={isSaving || !hasUnsavedChanges}
      aria-label="Guardar en Google Sheets"
      title="Guardar en Google Sheets"
    >
      {label}
    </button>
  );
}
