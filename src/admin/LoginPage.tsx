import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { IMAGES } from '../config/images';
import { SmartImage } from '../components/ui/SmartImage';
import { LogoMark } from '../components/public/Logo';
import { isSupabaseConfigured } from '../lib/supabase';
import { AuthError, FullScreenLoader, NotAuthorized } from './AdminGuard';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin';

  if (status === 'loading') return <FullScreenLoader label="Restoring your session…" />;
  if (status === 'admin') return <Navigate to={target} replace />;
  if (status === 'not_admin') return <NotAuthorized />;
  if (status === 'error') return <AuthError />;

  const checking = status === 'checking';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const message = await signIn(email, password);
    setSubmitting(false);
    if (message) setError(message);
  };

  if (checking && !submitting && !email) return <FullScreenLoader label="Verifying admin access…" />;

  return (
    <div className="login">
      <div className="login-visual">
        <SmartImage image={IMAGES.aboutRoom} eager className="login-img" />
        <div className="login-visual-copy">
          <LogoMark size={40} />
          <h2>Your studio, beautifully organised.</h2>
          <p>Appointments, services, therapists and opening hours — all in one calm place.</p>
        </div>
      </div>

      <div className="login-panel">
        <Link to="/" className="login-back"><ArrowLeft /> Back to website</Link>
        <form className="login-form" onSubmit={onSubmit} noValidate>
          <span className="login-mark"><LogoMark size={44} /></span>
          <h1>Welcome back</h1>
          <p className="login-sub">Sign in to the studio dashboard.</p>

          {!isSupabaseConfigured && (
            <div className="alert alert-warn"><CircleAlert /><span>Supabase isn’t configured yet. Add your keys to <code>.env.local</code> and restart the dev server.</span></div>
          )}

          {error && (
            <div className="alert alert-error" role="alert"><CircleAlert /><span>{error}</span></div>
          )}

          <label className="field">
            <span className="field-label">Email</span>
            <span className="input-with-icon">
              <Mail />
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" autoFocus />
            </span>
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <span className="input-with-icon password-wrap">
              <Lock />
              <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="icon-btn password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting || checking}>
            {submitting ? (
              <><span className="spinner" /> Signing in…</>
            ) : checking ? (
              <><span className="spinner" /> Verifying admin access…</>
            ) : (
              <>Sign in <ArrowRight className="btn-arrow" /></>
            )}
          </button>
          <p className="login-foot">Access is limited to authorised studio administrators.</p>
        </form>
      </div>
    </div>
  );
}
