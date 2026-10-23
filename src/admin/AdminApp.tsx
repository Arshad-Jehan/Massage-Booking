import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AdminGuard, FullScreenLoader } from './AdminGuard';
import LoginPage from './LoginPage';
import AdminLayout from './AdminLayout';
import '../styles/admin.css';

const Overview = lazy(() => import('./pages/Overview'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Services = lazy(() => import('./pages/Services'));
const Masseuses = lazy(() => import('./pages/Masseuses'));
const BusinessHours = lazy(() => import('./pages/BusinessHours'));
const BlockedDates = lazy(() => import('./pages/BlockedDates'));
const Settings = lazy(() => import('./pages/Settings'));

export default function AdminApp() {
  return (
    <AuthProvider>
      <Suspense fallback={<FullScreenLoader label="Loading dashboard…" />}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="services" element={<Services />} />
              <Route path="masseuses" element={<Masseuses />} />
              <Route path="hours" element={<BusinessHours />} />
              <Route path="blocked-dates" element={<BlockedDates />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
