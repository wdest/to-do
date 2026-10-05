import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Məxfilik qaydaları | Mind",
  description: "Mind tətbiqində hesab və tapşırıq məlumatlarının necə istifadə olunduğu.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link href="/" className="legal-back">← Mind-ə qayıt</Link>
        <p className="legal-eyebrow">Mind · Məxfilik</p>
        <h1>Məxfilik qaydaları</h1>
        <p className="legal-updated">Son yenilənmə: 5 oktyabr 2026</p>

        <p>Mind şəxsi tapşırıqlarını planlamaq və xatırlatmalar qurmaq üçün nəzərdə tutulmuş xidmətdir. Bu qaydalar hesab və tətbiqdən istifadə zamanı saxlanan məlumatları izah edir.</p>

        <h2>Saxladığımız məlumatlar</h2>
        <ul>
          <li>Google ilə daxil olduqda, hesabını tanımaq üçün Google-dan təsdiqlənmiş email ünvanını və əsas profil məlumatlarını alırıq. Şifrəni Google bizə vermir.</li>
          <li>Yazdığın tapşırıqları, onların yaradılma və tamamlanma vaxtını, seçdiyin xatırlatma vaxtını hesabına bağlayırıq.</li>
          <li>Bildirişləri aktivləşdirsən, xatırlatmaları çatdırmaq üçün cihazının push-abunə məlumatlarını saxlayırıq.</li>
          <li>Giriş sessiyası brauzerində saxlanır ki, hər dəfə yenidən daxil olmaq lazım gəlməsin.</li>
        </ul>

        <h2>Məlumatlardan istifadə</h2>
        <p>Məlumatlar hesabına giriş vermək, tapşırıqlarını cihazların arasında sinxronlaşdırmaq, seçdiyin bildirişləri göndərmək və xidməti qorumaq üçün işlənir. Reklam məqsədilə istifadə olunmur və satılmır.</p>

        <h2>Saxlanma və silinmə</h2>
        <p>Aktiv tapşırıqlarını sən silənədək saxlayırıq. Tamamlanmış tapşırıqlar 3 gündən sonra vaxtı keçmiş sayılır və təmizlənir. Brauzerin ayarlarından bildiriş icazəsini ləğv edə bilərsən. Hesabını və ona bağlı məlumatları silmək üçün aşağıdakı emailə yaz.</p>

        <h2>Xidmət təminatçıları və təhlükəsizlik</h2>
        <p>Google kimliyini təsdiqləyir; Supabase hesab və tapşırıq məlumatlarını saxlayır; Vercel tətbiqi yayımlayır; brauzerin və əməliyyat sisteminin push xidməti bildirişləri cihazına çatdırır. Tapşırıqlar istifadəçi hesabına ayrılır və giriş qaydaları başqasının məlumatını oxumağı məhdudlaşdırır. İnternet üzərindən ötürülən məlumatların qorunması üçün müvafiq texniki tədbirlər tətbiq olunur.</p>

        <h2>Uşaqlar və əlaqə</h2>
        <p>Mind uşaqlar üçün xüsusi hazırlanmış xidmət deyil. Məxfilik və ya məlumatların silinməsi ilə bağlı sualın varsa, <a href="mailto:qasimzade.1806@gmail.com">qasimzade.1806@gmail.com</a> ünvanına yaz.</p>

        <nav className="legal-links" aria-label="Digər məlumatlar">
          <Link href="/terms">İstifadə şərtləri</Link>
          <Link href="/">Ana səhifə</Link>
        </nav>
      </article>
    </main>
  );
}
