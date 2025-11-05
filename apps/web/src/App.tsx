import { NavLink, Route, Routes } from 'react-router-dom';
import QueuePage from './pages/QueuePage';
import TemplatesPage from './pages/TemplatesPage';
import PagePostsPage from './pages/PagePostsPage';
import SettingsPage from './pages/SettingsPage';

const links = [
  { to: '/queue', label: 'Queue' },
  { to: '/templates', label: 'Templates' },
  { to: '/page-posts', label: 'Page Posts' },
  { to: '/settings', label: 'Settings' }
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Paste Happy Pro</h1>
      </header>
      <nav className="app-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<QueuePage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/page-posts" element={<PagePostsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
