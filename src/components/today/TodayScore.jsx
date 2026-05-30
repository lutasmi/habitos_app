/**
 * TodayScore.jsx
 *
 * Muestra el score del día de forma motivacional.
 * Usa CONFIG_SCORE para colorear el valor si hay reglas definidas.
 */

import { findScoreRule } from '../../domain/scoring.js';

export function TodayScore({ score, scoreRules = [] }) {
  const rule = findScoreRule(score, 'day', scoreRules);
  const color = rule?.color || null;
  const label = rule?.label || null;

  // Sin hábitos evaluados todavía
  if (score === 0 && !label) {
    return (
      <div className="today-score today-score--empty">
        <span className="today-score__value">—</span>
        <span className="today-score__label">Score del día</span>
      </div>
    );
  }

  return (
    <div className="today-score" style={color ? { '--score-color': color } : {}}>
      <span
        className="today-score__value"
        style={color ? { color } : {}}
      >
        {score > 0 ? `+${score}` : score}
      </span>
      {label && <span className="today-score__label">{label}</span>}
      {!label && <span className="today-score__label">Score del día</span>}
    </div>
  );
}
