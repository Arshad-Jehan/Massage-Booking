import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CircleAlert, LogOut, RefreshCw, ShieldX } from 'lucide-react';
import { useAuth } from './AuthContext';
import { LogoMark } from '../components/public/Logo';

export function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="auth-screen">
      <div className="auth-loader">
        <span className="auth-loader-mark"><LogoMark size={44} /></span>
        <span className="spinner" />
        <p>{label}</p>
      </div>
    </div>
  );
}

export function NotAuthorized() {
  const { user, signOut } = useAuth();
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-center">
        <div className="auth-icon warn"><ShieldX /></div>
        <h1>Access restricted</h1>
        <p className="auth-message">You are signed in, but you are not authorized as an admin.</p>
        {user?.email && <p className="auth-sub">Signed in as <strong>{user.email}</strong></p>}
        <div className="auth-actions">
          <button type="button" className="btn btn-primary" onClick={() => void signOut()}>
            <LogOut /> Sign out
          </button>
          <a className="btn btn-ghost" href={import.meta.env.BASE_URL}>Back to website</a>
        </div>
      </div>
    </div>
  );
}

export function AuthError() {
  const { error, recheck, signOut } = useAuth();
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-center">
        <div className="auth-icon error"><CircleAlert /></div>
        <h1>We couldn’t verify access</h1>
        <p className="auth-message">{error}</p>
        <div className="auth-actions">
          <button type="button" className="btn btn-primary" onClick={recheck}>
            <RefreshCw /> Try again
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Protects every /admin route. Never redirects until the admin check has finished. */
export function AdminGuard() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader label="Restoring your session…" />;
  if (status === 'checking') return <FullScreenLoader label="Verifying admin access…" />;
  if (status === 'signed_out') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (status === 'not_admin') return <NotAuthorized />;
  if (status === 'error') return <AuthError />;
  return <Outlet />;
}
