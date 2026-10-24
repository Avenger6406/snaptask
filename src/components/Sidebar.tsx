import { CalendarClock, CheckCircle2, Camera, LayoutDashboard, ListChecks, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SaveIndicator } from './SaveIndicator';
import type { ViewId } from '../types';

const ITEMS: ReadonlyArray<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'canvas', label: 'Canvas', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="brand" aria-hidden><Camera size={18} /></div>
      <ul>
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              className={`nav-btn ${view === id ? 'is-active' : ''}`}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              <Icon size={19} aria-hidden />
              <span className="nav-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="nav-bottom"><SaveIndicator /></div>
      <button type="button" className="nav-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
        <span className="nav-label">Theme</span>
      </button>
    </nav>
  );
}
