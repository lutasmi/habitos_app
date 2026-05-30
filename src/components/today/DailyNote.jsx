/**
 * DailyNote.jsx
 *
 * Textarea de nota libre del día. Guarda en DAILY_RECORDS.note.
 */

export function DailyNote({ value, onChange }) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor="daily-note">
        Nota del día
      </label>
      <textarea
        id="daily-note"
        className="field-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="¿Algo destacable hoy?"
        rows={3}
      />
    </div>
  );
}
