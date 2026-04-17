import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (loading) return null;

  if (user) {
    const initial = (user.email || '?').charAt(0).toUpperCase();
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-void-lighter transition-colors cursor-pointer"
          title={user.email}
        >
          <span className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 text-gold text-sm flex items-center justify-center">
            {initial}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-60 bg-void-light border border-border rounded-lg shadow-lg z-50">
            <div className="px-3 py-2 border-b border-border">
              <div className="text-[10px] uppercase tracking-wider text-text-dim">Signed in as</div>
              <div className="text-sm text-text-primary truncate">{user.email}</div>
            </div>
            <button
              onClick={async () => { await signOut(); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-void-lighter hover:text-gold transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  async function handleGoogle() {
    setError(null); setBusy(true);
    try { await signInWithGoogle(); }
    catch (err) { setError(err.message || 'Sign-in failed'); setBusy(false); }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError(null); setNotice(null); setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        setOpen(false);
      } else {
        await signUpWithEmail(email, password);
        setNotice('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'Auth failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 text-sm bg-gold/15 border border-gold/40 text-gold rounded-lg hover:bg-gold/25 transition-colors cursor-pointer"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-void-light border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="flex mb-3 border-b border-border">
            <button
              onClick={() => { setMode('signin'); setError(null); setNotice(null); }}
              className={`flex-1 pb-2 text-sm transition-colors cursor-pointer ${mode === 'signin' ? 'text-gold border-b-2 border-gold -mb-px' : 'text-text-dim hover:text-text-primary'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setNotice(null); }}
              className={`flex-1 pb-2 text-sm transition-colors cursor-pointer ${mode === 'signup' ? 'text-gold border-b-2 border-gold -mb-px' : 'text-text-dim hover:text-text-primary'}`}
            >
              Create account
            </button>
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-void border border-border rounded-lg hover:border-gold/40 text-sm text-text-primary cursor-pointer disabled:opacity-50 transition-colors"
          >
            <GoogleGlyph />
            Continue with Google
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-text-dim">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-void border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-gold/40"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-void border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-gold/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-gold/20 border border-gold/40 text-gold rounded-lg text-sm font-medium hover:bg-gold/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          {notice && <p className="mt-2 text-xs text-text-secondary">{notice}</p>}
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.8l6.2 5.3C41.1 36 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
