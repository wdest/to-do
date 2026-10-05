"use client";

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Leaf, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'reset' | 'update';
export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // INITIAL_SESSION also covers OAuth/email redirects handled by the SDK.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setMode('update');
      if (event === 'SIGNED_OUT') { setMode('login'); setPassword(''); }
    });
    localStorage.removeItem('is_unlocked');
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const origin = window.location.origin;
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: origin } });
        if (error) throw error;
        setMessage('Qeydiyyatı tamamlamaq üçün email ünvanına göndərilən təsdiq linkini aç.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin });
        if (error) throw error;
        setMessage('Bu email üçün hesab varsa, bərpa linki göndəriləcək.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMode('login');
      }
      setPassword('');
    } catch {
      setMessage(mode === 'login' ? 'Giriş alınmadı. Email, şifrə və email təsdiqini yoxla.' : 'Əməliyyat alınmadı. Bir qədər sonra yenidən cəhd et.');
    } finally { setBusy(false); }
  }

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch {
      setMessage('Google ilə giriş başlamadı. Google Auth ayarlarını bir az sonra yoxla.');
      setBusy(false);
    }
  }

  if (!ready) return <main className="auth-screen"><p role="status">Sakit məkanın hazırlanır…</p></main>;
  if (user && mode !== 'update') return <>{children(user)}</>;
  return <main className="auth-screen"><section className="auth-card">
    <span className="brand-icon mx-auto"><Leaf size={24} /></span>
    <p className="eyebrow justify-center mt-6">NİLUFƏR · SƏNİN SAKİT MƏKANIN</p>
    <h1>{mode === 'signup' ? 'Öz məkanını yarat.' : mode === 'reset' ? 'Şifrəni bərpa et.' : mode === 'update' ? 'Yeni şifrə seç.' : 'Yenidən xoş gəldin.'}</h1>
    <p className="auth-description">Tapşırıqların yalnız sənin hesabında. Kiçik addımlarına buradan davam et.</p>
    <form onSubmit={submit} className="auth-form">
      {mode !== 'update' && <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== 'reset' && <label>Şifrə<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />{mode !== 'login' && <small>Ən azı 12 simvol.</small>}</label>}
      {message && <p role="status" className="auth-message">{message}</p>}
      <button className="primary-action justify-center w-full" disabled={busy}>{busy ? 'Gözlə…' : mode === 'signup' ? 'Hesab yarat' : mode === 'reset' ? 'Bərpa linki göndər' : mode === 'update' ? 'Şifrəni yenilə' : 'Daxil ol'}<ArrowUpRight size={17} /></button>
    </form>
    {(mode === 'login' || mode === 'signup') && <>
      <div className="auth-divider"><span>və ya</span></div>
      <button type="button" className="google-auth-button" onClick={() => void signInWithGoogle()} disabled={busy}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.57 5.88c4.42-4.09 7.17-10.11 7.17-17.53Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.89-5.92l-7.57-5.88c-2.14 1.43-4.88 2.28-8.32 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        Google ilə davam et
      </button>
    </>}
    {mode !== 'update' && <div className="auth-links"><button onClick={() => { setMode(mode === 'signup' || mode === 'reset' ? 'login' : 'signup'); setMessage(''); setPassword(''); }}>{mode === 'login' ? 'Hesabın yoxdur? Qeydiyyatdan keç' : 'Girişə qayıt'}</button>{mode === 'login' && <button onClick={() => { setMode('reset'); setMessage(''); setPassword(''); }}>Şifrəni unutmusan?</button>}</div>}
    {mode !== 'update' && <nav className="auth-legal-links" aria-label="Hüquqi məlumatlar"><a href="/privacy">Məxfilik</a><a href="/terms">İstifadə şərtləri</a></nav>}
    {mode === 'update' && <button className="empty-add mx-auto" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>Çıxış</button>}
  </section></main>;
}
