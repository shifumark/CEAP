import { useTheme, Theme } from '../context/ThemeContext';
import ProfilePictureUpload from '../components/ProfilePictureUpload';

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  swatches: string[];
  // Hardcoded (not CSS vars) on purpose — this card previews what
  // *that* theme looks like, independent of whichever theme is actually
  // active site-wide right now. Pulled directly from each theme's own
  // block in styles.css.
  preview: {
    bgStart: string;
    bgEnd: string;
    cardBg: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    name: 'Purple Phammy',
    description: 'The original dark purple & pink glassmorphism theme.',
    swatches: ['#180A2E', '#A78BFA', '#F472B6', '#241242'],
    preview: {
      bgStart: '#180A2E',
      bgEnd: '#2D1150',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.16)',
      textPrimary: '#F5F3FF',
      textSecondary: '#B9AFDA'
    }
  },
  {
    id: 'avocado',
    name: 'Avocado Green Serenity',
    description: 'A premium pastel light theme — avocado green, lavender, and soft glass surfaces.',
    swatches: ['#C7EEB9', '#D8C4F8', '#C7D5F7', '#8B5CF6'],
    preview: {
      bgStart: '#C7EEB9',
      bgEnd: '#AEE092',
      cardBg: 'rgba(255, 255, 255, 0.75)',
      border: '#E3ECE0',
      textPrimary: '#111111',
      textSecondary: '#374151'
    }
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
          <h1>Settings</h1>
          <p>Manage your profile picture and choose a color theme for this device.</p>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3>Profile Picture</h3>
          </div>
          <ProfilePictureUpload />
        </div>

        <div className="page-header" style={{ marginTop: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem' }}>Theme Settings</h1>
          <p>Choose the color theme for this device. Your choice is saved locally and won't affect other users.</p>
        </div>

        <div className="grid grid-2">
          {THEME_OPTIONS.map((option) => {
            const isActive = theme === option.id;
            const { preview } = option;
            return (
              <div
                key={option.id}
                role="button"
                tabIndex={0}
                onClick={() => setTheme(option.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setTheme(option.id);
                }}
                style={{
                  cursor: 'pointer',
                  outline: 'none',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md)',
                  border: isActive ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  // The theme's own page-background gradient, so the glass
                  // card inside reads correctly against it — this is what
                  // makes the preview self-contained instead of borrowing
                  // whichever theme is actually active right now.
                  background: `linear-gradient(135deg, ${preview.bgStart}, ${preview.bgEnd})`,
                  padding: '1.25rem'
                }}
              >
                <div
                  style={{
                    background: preview.cardBg,
                    border: `1px solid ${preview.border}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.25rem',
                      paddingBottom: '0.85rem',
                      borderBottom: `1px solid ${preview.border}`
                    }}
                  >
                    <h3 style={{ color: preview.textPrimary }}>{option.name}</h3>
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
                          border: `1px solid ${preview.border}`,
                          display: 'inline-block'
                        }}
                      />
                    ))}
                  </div>

                  <p style={{ color: preview.textSecondary, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
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
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
