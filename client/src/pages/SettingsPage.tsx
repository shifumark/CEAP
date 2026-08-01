import { useTheme, Theme } from '../context/ThemeContext';

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  swatches: string[];
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'The original dark purple & pink glassmorphism theme.',
    swatches: ['#180A2E', '#A78BFA', '#F472B6', '#241242']
  },
  {
    id: 'avocado',
    name: 'Avocado Green Serenity',
    description: 'A premium pastel light theme — avocado green, lavender, and soft glass surfaces.',
    swatches: ['#C7EEB9', '#D8C4F8', '#C7D5F7', '#8B5CF6']
  }
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">Theme Settings</div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Theme Settings</h1>
          <p>Choose the color theme for this device. Your choice is saved locally and won't affect other users.</p>
        </div>

        <div className="grid grid-2">
          {THEME_OPTIONS.map((option) => {
            const isActive = theme === option.id;
            return (
              <div
                key={option.id}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => setTheme(option.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setTheme(option.id);
                }}
                style={{
                  cursor: 'pointer',
                  border: isActive ? '2px solid var(--accent-purple)' : undefined,
                  outline: 'none'
                }}
              >
                <div className="card-header">
                  <h3>{option.name}</h3>
                  {isActive && <span className="badge badge-primary">Active</span>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {option.swatches.map((color) => (
                    <span
                      key={color}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        border: '1px solid var(--border)',
                        display: 'inline-block'
                      }}
                    />
                  ))}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  {option.description}
                </p>

                <button
                  className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme(option.id);
                  }}
                  disabled={isActive}
                >
                  {isActive ? 'Currently Active' : 'Use This Theme'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
