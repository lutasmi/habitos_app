/**
 * DayTypeSelector.jsx
 *
 * Dropdown alimentado por CONFIG_DAY_TYPES.
 * Si no hay tipos configurados, muestra campo vacío sin bloquear.
 */

export function DayTypeSelector({ dayTypes = [], value, onChange }) {
  const active = dayTypes.filter(
    dt => dt.active === 'true' || dt.active === true
  ).sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

  return (
    <div className="field-group">
      <label className="field-label" htmlFor="day-type">
        Tipo de día
      </label>
      <select
        id="day-type"
        className="field-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Sin especificar —</option>
        {active.map(dt => (
          <option key={dt.day_type_id} value={dt.day_type_id}>
            {dt.emoji ? `${dt.emoji} ` : ''}{dt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
