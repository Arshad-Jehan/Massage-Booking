import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CalendarOff,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { LogoMark } from '../components/public/Logo';
import { fetchSettings } from '../lib/api';
import { FALLBACK_BRAND } from '../config/images';
import { useAuth } from './AuthContext';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/services', label: 'Services', icon: Sparkles },
  { to: '/admin/masseuses', label: 'Masseuses', icon: UsersRound },
  { to: '/admin/hours', label: 'Business Hours', icon: Clock },
  { to: '/admin/blocked-dates', label: 'Blocked Dates', icon: CalendarOff },
  { to: '/admin/settings', label: 'Massage Settings', icon: Settings2 },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const [brand, setBrand] = useState(FALLBACK_BRAND);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchSettings()
      .then((s) => s?.business_name && setBrand(s.business_name))
      .catch(() => {});
    const onRename = (e: Event) => setBrand((e as CustomEvent<string>).detail);
    window.addEventListener('studio:renamed', onRename);
    return () => window.removeEventListener('studio:renamed', onRename);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const email = user?.email ?? '';

  return (
    <div className={`admin ${open ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-mark"><LogoMark size={34} /></span>
          <div>
            <strong>{brand}</strong>
            <span>Studio dashboard</span>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard">
          <span className="sidebar-section">Manage</span>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer" className="sidebar-link subtle">
            <ExternalLink />
            <span>View website</span>
          </a>
          <div className="sidebar-user">
            <span className="sidebar-avatar">{email.slice(0, 1).toUpperCase() || 'A'}</span>
            <div>
              <strong>{email || 'Administrator'}</strong>
              <span>Administrator</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
      <div className="sidebar-scrim" onClick={() => setOpen(false)} />

      <div className="admin-main">
        <div className="admin-topbar">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <span className="admin-topbar-brand"><LogoMark size={26} /> {brand}</span>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
