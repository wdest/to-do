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
    {mode !== 'update' && <div className="auth-links"><button onClick={() => { setMode(mode === 'signup' || mode === 'reset' ? 'login' : 'signup'); setMessage(''); setPassword(''); }}>{mode === 'login' ? 'Hesabın yoxdur? Qeydiyyatdan keç' : 'Girişə qayıt'}</button>{mode === 'login' && <button onClick={() => { setMode('reset'); setMessage(''); setPassword(''); }}>Şifrəni unutmusan?</button>}</div>}
    {mode === 'update' && <button className="empty-add mx-auto" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>Çıxış</button>}
  </section></main>;
}
