/**
 * EvolutionPage.jsx — Fase 4 definitiva
 *
 * Estructura:
 *   1. Heatmap global  → DAILY_RECORDS.score_day
 *   2. Sección Hábitos → un HeatmapBlock por CONFIG_HABIT_GROUPS
 *      filtro interno: Todos | hábito concreto
 *      métrica: suma de score_value del grupo | score_value del hábito
 *   3. Sección Actividades → un HeatmapBlock por CONFIG_ACTIVITY_GROUPS
 *      filtro interno: Todas | actividad concreta
 *      métrica: número de registros del grupo | número de registros de la actividad
 *
 * Sin peticiones de red — datos desde AppShell.
 * Sin librerías externas — solo CSS flex.
 */

import { useState, useMemo } from 'react';
import '../../styles/evolution.css';
import { SyncStatus }    from '../common/SyncStatus.jsx';
import { addDays, formatDate, parseDate } from '../../domain/dates.js';
import { findScoreRule } from '../../domain/scoring.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const LOOKBACK_DAYS = 90;

// ── Rango de fechas (estable durante la sesión) ───────────────────────────────

function buildDateRange(n) {
  const today = formatDate(new Date());
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

// ── Agrupación en semanas (columnas del heatmap, lunes arriba) ────────────────

function toWeeks(dates) {
  if (!dates.length) return [];
  const leading = (parseDate(dates[0]).getDay() + 6) % 7;
  const slots   = [...Array(leading).fill(null), ...dates];
  const weeks   = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

function buildMonthLabels(weeks) {
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return weeks.map((week, wi) => {
    const first = week.find(Boolean);
    if (!first) return '';
    const mo = parseDate(first).getMonth();
    if (wi === 0) return M[mo];
    const prev = weeks[wi - 1].find(Boolean);
    return prev && parseDate(prev).getMonth() !== mo ? M[mo] : '';
  });
}

// ── Color: score (hábitos / global) ──────────────────────────────────────────

function scoreColor(score, hasData, scoreRules) {
  if (!hasData) return null;
  if (scoreRules?.length) {
    const r = findScoreRule(score, 'day', scoreRules);
    if (r?.color) return r.color;
  }
  if (score < 0)   return '#fca5a5'; // rojo suave
  if (score === 0) return '#d1d5db'; // gris neutro
  if (score <= 3)  return '#86efac'; // verde suave
  return '#16a34a';                  // verde sólido
}

// ── Color: actividades (solo por número de registros) ────────────────────────

function activityColor(count, hasData) {
  if (!hasData || count === 0) return null;
  if (count === 1) return '#86efac'; // 1 registro → verde suave
  return '#16a34a';                  // 2+ → verde sólido
}

// ── Estadísticas básicas ──────────────────────────────────────────────────────

function stats(days) {
  const withData = days.filter(d => d.hasData);
  if (!withData.length) return { count: 0, avg: null, best: null };
  const vals = withData.map(d => d.value);
  const avg  = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return { count: withData.length, avg, best: Math.max(...vals) };
}

// ── Cuadrado del heatmap ──────────────────────────────────────────────────────

function Day({ date, color, hasData, tip }) {
  if (!date) return <div className="hm-day" style={{ background: 'transparent' }} />;
  return (
    <div
      className={`hm-day${hasData ? '' : ' hm-day--empty'}`}
      style={color ? { background: color } : {}}
      title={tip}
    />
  );
}

// ── Grid del heatmap (reutilizable) ──────────────────────────────────────────

function HeatmapGrid({ weeks, monthLabels, getCell }) {
  return (
    <div className="hm-wrap">
      <div className="hm-months">
        {weeks.map((_, wi) => (
          <div key={wi} className="hm-month-lbl" style={{ width: 13, minWidth: 13 }}>
            {monthLabels[wi]}
          </div>
        ))}
      </div>
      <div className="hm-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="hm-week">
            {week.map((date, di) => {
              const cell = getCell(date);
              return (
                <Day
                  key={date ?? `e-${wi}-${di}`}
                  date={date}
                  color={cell?.color ?? null}
                  hasData={cell?.hasData ?? false}
                  tip={cell?.tip ?? ''}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Resumen compacto bajo cada heatmap ────────────────────────────────────────

function HeatmapStats({ s, unit = '' }) {
  if (s.count === 0) return <p className="hm-stats-empty">Sin datos en este periodo.</p>;
  return (
    <div className="hm-stats">
      <span><strong>{s.count}</strong> días</span>
      <span>media <strong>{s.avg}{unit}</strong></span>
      <span>máx <strong>{s.best}{unit}</strong></span>
    </div>
  );
}

// ── Bloque reutilizable: filtro + heatmap + stats ─────────────────────────────

function HeatmapBlock({ title, filterOptions, weeks, monthLabels, computeDays, scoreRules, colorFn }) {
  const [filterId, setFilterId] = useState(filterOptions[0]?.value ?? '');

  const days = useMemo(
    () => computeDays(filterId),
    [filterId, computeDays]
  );

  const dayMap = useMemo(() => {
    const m = {};
    days.forEach(d => { m[d.date] = d; });
    return m;
  }, [days]);

  const s = useMemo(() => stats(days), [days]);

  return (
    <div className="hm-block">
      <div className="hm-block__header">
        <span className="hm-block__title">{title}</span>
        {filterOptions.length > 1 && (
          <select
            className="hm-block__select"
            value={filterId}
            onChange={e => setFilterId(e.target.value)}
          >
            {filterOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      <HeatmapGrid
        weeks={weeks}
        monthLabels={monthLabels}
        getCell={date => {
          if (!date) return null;
          const d = dayMap[date];
          return {
            color:   colorFn(d?.value ?? 0, d?.hasData ?? false, scoreRules),
            hasData: d?.hasData ?? false,
            tip:     d?.hasData ? `${date}  ${d.value}` : `${date}  sin dato`,
          };
        }}
      />

      <HeatmapStats s={s} />
    </div>
  );
}

// ── Sección 1: Heatmap global ─────────────────────────────────────────────────

function GlobalHeatmap({ allDailyRecords, scoreRules, weeks, monthLabels }) {
  const recordsByDate = useMemo(() => {
    const m = {};
    (allDailyRecords || []).forEach(r => { m[r.date] = r; });
    return m;
  }, [allDailyRecords]);

  const days = useMemo(() =>
    (weeks.flat().filter(Boolean)).map(date => {
      const rec = recordsByDate[date];
      return { date, value: rec ? (parseFloat(rec.score_day) || 0) : 0, hasData: !!rec };
    }),
  [weeks, recordsByDate]);

  const dayMap = useMemo(() => {
    const m = {};
    days.forEach(d => { m[d.date] = d; });
    return m;
  }, [days]);

  const s = useMemo(() => stats(days), [days]);

  const legendItems = scoreRules?.length
    ? scoreRules
        .filter(r => r.scope === 'day' && (r.active === 'true' || r.active === true))
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map(r => ({ color: r.color, label: r.label }))
    : [
        { color: '#fca5a5', label: 'Negativo' },
        { color: '#d1d5db', label: 'Neutro'   },
        { color: '#86efac', label: 'Positivo' },
        { color: '#16a34a', label: 'Alto'     },
      ];

  return (
    <section className="evo-section">
      <h2 className="evo-section__title">Score general</h2>

      <div className="hm-block">
        <HeatmapGrid
          weeks={weeks}
          monthLabels={monthLabels}
          getCell={date => {
            if (!date) return null;
            const d = dayMap[date];
            const score = d?.value ?? 0;
            return {
              color:   scoreColor(score, d?.hasData ?? false, scoreRules),
              hasData: d?.hasData ?? false,
              tip:     d?.hasData
                         ? `${date}  score: ${score > 0 ? '+' : ''}${score}`
                         : `${date}  sin registro`,
            };
          }}
        />

        <div className="hm-legend">
          <span>Menos</span>
          {legendItems.map((it, i) => (
            <div key={i} className="hm-legend__swatch" style={{ background: it.color }} title={it.label} />
          ))}
          <span>Más</span>
        </div>

        <HeatmapStats s={s} />
      </div>
    </section>
  );
}

// ── Sección 2: Hábitos por grupos ─────────────────────────────────────────────

function HabitsSection({ config, allHabitValues, scoreRules, weeks, monthLabels }) {
  const groups = useMemo(() =>
    (config?.habitGroups || [])
      .filter(g => (g.active === 'true' || g.active === true) &&
                   (g.visible === 'true' || g.visible === true))
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
  [config]);

  const allHabits = useMemo(() =>
    (config?.habits || []).filter(
      h => (h.active === 'true' || h.active === true) &&
           (h.visible === 'true' || h.visible === true)
    ),
  [config]);

  // Índice: date__habit_id → score_value
  const hvIndex = useMemo(() => {
    const m = {};
    (allHabitValues || []).forEach(hv => {
      m[`${hv.date}__${hv.habit_id}`] = parseFloat(hv.score_value) || 0;
    });
    return m;
  }, [allHabitValues]);

  // Fechas del rango (plano)
  const dates = useMemo(() => weeks.flat().filter(Boolean), [weeks]);

  if (!groups.length) return null;

  return (
    <section className="evo-section">
      <h2 className="evo-section__title">Hábitos</h2>

      {groups.map(group => {
        const groupHabits = allHabits
          .filter(h => h.group_id === group.group_id)
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

        if (!groupHabits.length) return null;

        const filterOptions = [
          { value: '__all__', label: 'Todos' },
          ...groupHabits.map(h => ({ value: h.habit_id, label: h.name })),
        ];

        // computeDays debe ser estable — lo envolvemos en useCallback inline
        // pasando datos como parámetros externos (no closures variables)
        function computeDays(filterId) {
          return dates.map(date => {
            if (filterId === '__all__') {
              // Suma de score_value de todos los hábitos del grupo ese día
              let sum = 0;
              let anyData = false;
              groupHabits.forEach(h => {
                const key = `${date}__${h.habit_id}`;
                if (key in hvIndex) {
                  sum += hvIndex[key];
                  anyData = true;
                }
              });
              return { date, value: Math.round(sum * 10) / 10, hasData: anyData };
            } else {
              const key   = `${date}__${filterId}`;
              const score = hvIndex[key];
              return {
                date,
                value:   score !== undefined ? score : 0,
                hasData: score !== undefined,
              };
            }
          });
        }

        return (
          <HeatmapBlock
            key={group.group_id}
            title={`${group.emoji ? group.emoji + ' ' : ''}${group.name}`}
            filterOptions={filterOptions}
            weeks={weeks}
            monthLabels={monthLabels}
            computeDays={computeDays}
            scoreRules={scoreRules}
            colorFn={scoreColor}
          />
        );
      })}
    </section>
  );
}

// ── Sección 3: Actividades por grupos ─────────────────────────────────────────

function ActivitiesSection({ config, activityLog, weeks, monthLabels }) {
  const groups = useMemo(() =>
    (config?.activityGroups || [])
      .filter(g => (g.active === 'true' || g.active === true) &&
                   (g.visible === 'true' || g.visible === true))
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
  [config]);

  const allActivities = useMemo(() =>
    (config?.activities || []).filter(
      a => (a.active === 'true' || a.active === true) &&
           (a.visible === 'true' || a.visible === true)
    ),
  [config]);

  // Índice: activity_id__date → número de registros
  const logIndex = useMemo(() => {
    const m = {};
    (activityLog || []).forEach(l => {
      const key = `${l.activity_id}__${l.date}`;
      m[key] = (m[key] || 0) + 1;
    });
    return m;
  }, [activityLog]);

  // Índice: group_id__date → número de registros de ese grupo
  const groupLogIndex = useMemo(() => {
    const m = {};
    (activityLog || []).forEach(l => {
      const act = allActivities.find(a => a.activity_id === l.activity_id);
      if (!act) return;
      const key = `${act.group_id}__${l.date}`;
      m[key] = (m[key] || 0) + 1;
    });
    return m;
  }, [activityLog, allActivities]);

  const dates = useMemo(() => weeks.flat().filter(Boolean), [weeks]);

  if (!groups.length) return null;

  return (
    <section className="evo-section">
      <h2 className="evo-section__title">Actividades</h2>

      {groups.map(group => {
        const groupActivities = allActivities
          .filter(a => a.group_id === group.group_id)
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

        if (!groupActivities.length) return null;

        const filterOptions = [
          { value: '__all__', label: 'Todas' },
          ...groupActivities.map(a => ({ value: a.activity_id, label: a.name })),
        ];

        function computeDays(filterId) {
          return dates.map(date => {
            const count = filterId === '__all__'
              ? (groupLogIndex[`${group.group_id}__${date}`] || 0)
              : (logIndex[`${filterId}__${date}`] || 0);
            return { date, value: count, hasData: count > 0 };
          });
        }

        return (
          <HeatmapBlock
            key={group.group_id}
            title={`${group.emoji ? group.emoji + ' ' : ''}${group.name}`}
            filterOptions={filterOptions}
            weeks={weeks}
            monthLabels={monthLabels}
            computeDays={computeDays}
            scoreRules={[]}
            colorFn={(value, hasData) => activityColor(value, hasData)}
          />
        );
      })}
    </section>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function EvolutionPage({
  config,
  allDailyRecords,
  allHabitValues,
  activityLog,
  syncStatus,
  syncMessage,
  lastSync,
}) {
  const [innerTab, setInnerTab] = useState('habits');

  const dates       = useMemo(() => buildDateRange(LOOKBACK_DAYS), []);
  const weeks       = useMemo(() => toWeeks(dates), [dates]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);
  const scoreRules  = config?.scoreRules || [];

  return (
    <div className="evolution-page">
      <header className="app-header">
        <span className="app-header__title">Evolución</span>
        <SyncStatus status={syncStatus} message={syncMessage} lastSync={lastSync} />
      </header>

      <main className="evolution-main">
        {config === null ? (
          <div className="evolution-empty">Cargando datos…</div>
        ) : (
          <>
            {/* Heatmap global — siempre visible */}
            <GlobalHeatmap
              allDailyRecords={allDailyRecords}
              scoreRules={scoreRules}
              weeks={weeks}
              monthLabels={monthLabels}
            />

            {/* Tabs internas */}
            <div className="evo-inner-tabs">
              <button
                type="button"
                className={`evo-inner-tab${innerTab === 'habits' ? ' evo-inner-tab--active' : ''}`}
                onClick={() => setInnerTab('habits')}
              >
                Hábitos
              </button>
              <button
                type="button"
                className={`evo-inner-tab${innerTab === 'activities' ? ' evo-inner-tab--active' : ''}`}
                onClick={() => setInnerTab('activities')}
              >
                Actividades
              </button>
            </div>

            {/* Contenido de la tab activa */}
            {innerTab === 'habits' && (
              <HabitsSection
                config={config}
                allHabitValues={allHabitValues}
                scoreRules={scoreRules}
                weeks={weeks}
                monthLabels={monthLabels}
              />
            )}

            {innerTab === 'activities' && (
              <ActivitiesSection
                config={config}
                activityLog={activityLog}
                weeks={weeks}
                monthLabels={monthLabels}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
