/**
 * BottomNav.jsx
 *
 * Navegación inferior entre pantallas principales.
 * Simple y sin dependencias externas de routing.
 */

export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'habits',     label: 'Hábitos',     icon: '✓' },
    { id: 'activities', label: 'Actividades',  icon: '⚡' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__tab ${activeTab === tab.id ? 'bottom-nav__tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
