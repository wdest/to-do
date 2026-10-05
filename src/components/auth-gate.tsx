"use client";

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (search.has('error') || hash.has('error')) {
      setMessage('Google ilə giriş alınmadı. Yenidən cəhd et.');
      window.history.replaceState(null, '', window.location.origin);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    localStorage.removeItem('is_unlocked');
    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch {
      setMessage('Google ilə giriş başlamadı. Bir qədər sonra yenidən cəhd et.');
      setBusy(false);
    }
  }

  if (!ready) return <main className="auth-screen"><p role="status">Sakit məkanın hazırlanır…</p></main>;
  if (user) return <>{children(user)}</>;

  return <main className="auth-screen"><section className="auth-card">
    <span className="brand-icon mx-auto"><Leaf size={24} /></span>
    <p className="eyebrow justify-center mt-6">NİLUFƏR · SƏNİN SAKİT MƏKANIN</p>
    <h1>Tapşırıqlarına davam et.</h1>
    <p className="auth-description">Hesabına Google ilə təhlükəsiz daxil ol. Tapşırıqların yalnız sənin hesabında qalır.</p>
    {message && <p role="status" className="auth-message">{message}</p>}
    <button type="button" className="google-auth-button" onClick={() => void signInWithGoogle()} disabled={busy}>
      <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.57 5.88c4.42-4.09 7.17-10.11 7.17-17.53Z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.89-5.92l-7.57-5.88c-2.14 1.43-4.88 2.28-8.32 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      </svg>
      {busy ? 'Google açılır…' : 'Google ilə davam et'}
    </button>
    <p className="auth-provider-note">Şifrən Google-da qalır. Mind Google-dan yalnız əsas profil və email məlumatını alır.</p>
    <nav className="auth-legal-links" aria-label="Hüquqi məlumatlar"><Link href="/privacy">Məxfilik</Link><Link href="/terms">İstifadə şərtləri</Link></nav>
  </section></main>;
}
