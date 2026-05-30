/**
 * BottomNav.jsx
 *
 * Navegación inferior. Iconos SVG inline para mejor
 * control visual en dark theme.
 */

const ICONS = {
  habits: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  activities: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  evolution: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="4" height="4" rx="1" />
      <rect x="10" y="3" width="4" height="4" rx="1" />
      <rect x="17" y="3" width="4" height="4" rx="1" />
      <rect x="3" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <rect x="17" y="10" width="4" height="4" rx="1" />
      <rect x="3" y="17" width="4" height="4" rx="1" />
      <rect x="10" y="17" width="4" height="4" rx="1" />
      <rect x="17" y="17" width="4" height="4" rx="1" />
    </svg>
  ),
  system: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  ),
};

export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'habits',     label: 'Hábitos'    },
    { id: 'activities', label: 'Actividades' },
    { id: 'evolution',  label: 'Evolución'   },
    { id: 'system',     label: 'Sistema'     },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__tab${activeTab === tab.id ? ' bottom-nav__tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {ICONS[tab.id]}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
