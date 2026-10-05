import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İstifadə şərtləri | Mind",
  description: "Mind tapşırıq xidmətindən istifadə şərtləri.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link href="/" className="legal-back">← Mind-ə qayıt</Link>
        <p className="legal-eyebrow">Mind · İstifadə</p>
        <h1>İstifadə şərtləri</h1>
        <p className="legal-updated">Son yenilənmə: 5 oktyabr 2026</p>

        <p>Mind şəxsi tapşırıqlarını və xatırlatmalarını idarə etmək üçün təqdim olunur. Xidmətdən istifadə etməklə aşağıdakı qaydalara əməl etməyə razılaşırsan.</p>

        <h2>Hesab və məlumatların</h2>
        <p>Hesab məlumatlarını təhlükəsiz saxla və öz hesabından edilən fəaliyyətə diqqət yetir. Yalnız paylaşmağa haqqın olan məzmunu əlavə et. Tapşırıqlarını tətbiqdə silə bilərsən. Hesabın və bağlı məlumatların silinməsi üçün dəstəyə müraciət edə bilərsən.</p>

        <h2>Xidmət və bildirişlər</h2>
        <p>Mind hazırda ödənişsiz təqdim olunur. Xidməti yeniləyə və ya müvəqqəti əlçatmaz edə bilərik. Push bildirişlərinin çatdırılması cihazın, brauzerin və şəbəkənin ayarlarından asılıdır; vacib hadisələr üçün yeganə xatırlatma vasitəsi kimi onlara güvənmə.</p>

        <h2>Qəbuledilməz istifadə</h2>
        <p>Xidmətdən qanunları pozmaq, başqalarının hesabına daxil olmaq, sistemə zərər vermək və ya digər şəxslərin hüquqlarını pozmaq üçün istifadə etmə.</p>

        <h2>Məxfilik və əlaqə</h2>
        <p>Məlumatların istifadəsi barədə ətraflı məlumat üçün <Link href="/privacy">Məxfilik qaydalarına</Link> bax. Suallar üçün <a href="mailto:qasimzade.1806@gmail.com">qasimzade.1806@gmail.com</a> ünvanına yaz.</p>

        <p>Şərtlər dəyişərsə, yenilənmiş tarix və mətn bu səhifədə göstəriləcək.</p>

        <nav className="legal-links" aria-label="Digər məlumatlar">
          <Link href="/privacy">Məxfilik qaydaları</Link>
          <Link href="/">Ana səhifə</Link>
        </nav>
      </article>
    </main>
  );
}
