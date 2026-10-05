# Nilufər: ictimai istifadəyə keçid analizi

Tarix: 5 oktyabr 2026. Əhatə: lokal Next.js tətbiqi, SQL miqrasiyası, Supabase sorğuları, push API-ləri və service worker. Canlı bazanın RLS/grant ayarları, hosting, OAuth paneli və cron konfiqurasiyası yoxlanılmayıb. Bu sənəd analiz və tətbiq planıdır; istifadəçi hesabları hələ qurulmayıb.

## Nəticə

Mövcud layihə şəxsi, ortaq məlumat dəsti ilə işləyir. İctimai istifadədən əvvəl Supabase Auth, bazada istifadəçi sahibliyi və RLS, autentifikasiyalı bildiriş endpoint-ləri birlikdə tətbiq edilməlidir. Təkcə giriş ekranı məlumatları qorumur.

## Kodda tapılan əsas risklər

| Prioritet | Sübut | Təsir | Lazım olan dəyişiklik |
| --- | --- | --- | --- |
| Kritik | `supabase_migration.sql`: hər iki cədvəldə `DISABLE ROW LEVEL SECURITY`, `user_id` yoxdur | Miqrasiya canlı bazada bu formada tətbiq olunubsa və client rollarına grant verilibsə, istifadəçilərin məlumatları ayrılmır | Sahiblik sütunları, RLS və minimum grant-lar |
| Kritik | `src/app/page.tsx`: `NEXT_PUBLIC_APP_PIN`, `localStorage.is_unlocked` | PIN brauzerdə yoxlanır, server şəxsiyyəti təsdiqləmir; interfeys kilidi API-ni qorumur | Supabase Auth sessiyası; hər server əməliyyatında sessiyanın etibarlılığının yoxlanması |
| Kritik | `src/app/api/push/send/route.ts`: POST/GET üçün giriş yoxlaması yoxdur, bütün subscriptions seçilir | İcazəsiz bildiriş göndərmə, tapşırıq başlığının başqa istifadəçilərə göndərilməsi və reminder vəziyyətinin dəyişdirilməsi | Ümumi broadcast-ı ləğv etmək; cron üçün server sirri; yalnız tapşırıq sahibinin cihazlarına göndərmək |
| Yüksək | Eyni faylda VAPID private key üçün sabit fallback mövcuddur | Kod çıxışı olan tərəf həmin göndərən açarı əldə edə bilər | Açar cütünü yeniləmək, private key-ni yalnız server environment-da saxlamaq; cihazların yenidən abunəliyi üçün keçid |
| Yüksək | `src/app/api/push/subscribe/route.ts`: xam JSON anonim qəbul olunur | Spam, təkrarlanan subscriptions, etibarsız endpoint-lər; göndərən serverdə istifadə olunan URL-lərə görə SSRF riski | Sessiya, schema/ölçü yoxlaması, istifadəçi-cihaz sahibliyi, provider/HTTPS endpoint yoxlaması və rate limit |
| Orta | Göndəriş xətaları udulur, sonra reminder silinir; atomik iş götürmə yoxdur | İtən və ya paralel cron zamanı təkrarlanan bildirişlər | İş növbəsi/outbox, atomik claim, retry, idempotency açarı, 404/410 subscriptions təmizliyi |
| Orta | `page.tsx`: ilkin sorğu bütün tasks-ı istəyir; realtime bütün cədvəli izləyir | Böyük məlumat dəstində artıq yük; API row limitinə görə natamam siyahı riski | İstifadəçi üzrə indeksli server pagination, ayrıca say sorğuları, RLS ilə qorunan realtime |
| Orta | Bildiriş payload və `public/sw.js` hələ `.jpg` ikonunu göstərir, ikon `.png`-yə keçib; click URL sabitdir | Qırıq ikon, staging-dən yanlış hosta keçid | Eyni-origin URL və faktiki ikon yolu |

Supabase publishable/anon açarının brauzerdə olması özlüyündə sirr sızması deyil. Qoruma RLS, grant-lar və doğrulanmış istifadəçi sessiyasına söykənməlidir. VAPID private key isə məxfidir.

## Tövsiyə edilən hesab sistemi

- Mövcud Next.js + Supabase texnologiyaları qalsın; ayrıca parol serveri qurulmasın.
- İlk versiya: Google ilə giriş; email/parol da veriləcəksə email təsdiqi, parol bərpası və production SMTP birlikdə qurulsun.
- `@supabase/ssr` ilə brauzer və server client-ləri, cookie sessiyası, təhlükəsiz OAuth callback və icazəli redirect ünvanları.
- Next.js 14 istifadə edildiyi üçün aktual nümunələrdəki yeni framework fayl adları kor-koranə köçürülməməlidir; versiyaya uyğun middleware inteqrasiyası edilməlidir.
- Çıxış, sessiya müddətinin bitməsi, hesab dəyişməsi zamanı əvvəlki istifadəçinin lokal task state-i və realtime kanalı təmizlənsin.
- Hesab silmə, məlumatların ixracı və qısa məxfilik izahı təqdim edilsin. Bunlar üçün ayrıca hüquqi uyğunluq rəyi bu analizin əhatəsində deyil.

## Məlumat modeli və icazələr

`tasks`: `user_id uuid not null references auth.users(id)`, `title`, `is_done`, `created_at`, `completed_at`, `reminder_at`. Başlıq ölçüsü və boş başlıq üçün bazada constraint. `is_done` və `completed_at` uyğunluğu; zamanın serverdə yazılması.

`push_subscriptions`: `user_id`, unikallaşdırılmış endpoint, subscription keys, created/updated timestamp. Bir brauzerdə hesab dəyişərkən subscription köhnə hesaba bağlı qalmamalıdır; köhnə qeyd silinməli/yenidən qeyd olunmalıdır. İstifadəçi başqa hesabın qeydini özünə keçirə bilməməlidir.

Hər iki cədvəldə `SELECT/INSERT/UPDATE/DELETE` yalnız `authenticated` roluna, `auth.uid() = user_id` şərti ilə. INSERT və UPDATE üçün `WITH CHECK` də olmalıdır; istifadəçi sahiblik sahəsini başqa istifadəçiyə dəyişə bilməməlidir. `anon` üçün task/subscription icazələri verilməsin. Client-dən gələn `user_id` etibarlı mənbə sayılmasın.

İndekslər: tasks `(user_id, created_at desc, id)`, tamamlanmış işlərin təmizliyi üçün `completed_at` üzrə partial index, vaxtı çatan xatırlatmalar üçün `reminder_at` üzrə partial index, subscriptions `(user_id)`. Qlobal privileged client yalnız cron kimi məhdud server işində; adi istifadəçi sorğuları öz JWT-si ilə işləsin.

## 48 saatlıq ömür və performans

Bu işdə artıq tətbiq olunan dəyişikliklər: hər göldə maksimum 12 dekorativ nilufər; siyahıda səhifə başına 20 tapşırıq; CSS ilə üzmə; memo ilə SVG-lərin təkrar renderinin azaldılması; axtarışın deferred hesablanması. Sayğaclar bütün mövcud işləri əhatə edir, qalan işlər siyahı səhifələrindən əlçatandır.

Tamamlandıqdan 48 saat sonra iş görünüşdən çıxır; ilk 24 saatdan sonra şəffaflığı azalır, yarpaqlar tədricən saralır və 48-ci saatda solmuş qəhvəyi rəng alır. Açıq səhifə dəqiqədə bir dəfə və yenidən görünən zaman yaşı yeniləyir. Fiziki təmizlik qorunan server cron işi ilə aparılır. Client yalnız solmanı göstərməli və müddəti keçmiş işi gizlətməlidir.

Bu məhdudiyyətlər DOM və animasiya yükünü sabit saxlayır; bütün telefonlarda konkret FPS zəmanəti deyil. Server pagination və real cihazlarda profil ölçümü hələ ayrıca işdir.

## Mövcud məlumatların təhlükəsiz köçürülməsi

1. Bazanın backup-ı və mövcud schema/grant/policy inventarı.
2. Sahib hesabının yaradılması; köhnə tapşırıqlar yalnız təsdiqlənmiş həmin hesaba bağlansın. İlk qeydiyyatdan keçən şəxsə avtomatik mənimsətmək olmaz.
3. Sahiblik sütununun əlavə olunması, köhnə qeydlərin backfill edilməsi, sonra NOT NULL/index/RLS/grant-ların birgə tətbiqi.
4. Köhnə push subscriptions-ın sahibi bilinmədiyi üçün yeni hesablara kor-koranə paylanmasın; cihazlar yenidən abunə olsun.
5. Staging-də iki istifadəçi ilə icazə sınaqları, sonra auth kodu və schema-nın əlaqələndirilmiş yayımı.
6. VAPID rotasiyası, OAuth/SMTP/cron sirləri, rate limit və monitorinq aktiv olduqdan sonra ictimai açılış.

## Pulsuz istifadə və xərc

İstifadəçilər üçün məhsul pulsuz qala bilər. Hosting, verilənlər bazası, trafik və email xidmətinin sahib üçün limitsiz pulsuz olacağına zəmanət yoxdur. Supabase Free planı başlanğıc üçün namizəddir; tutumu yalnız qeydiyyat sayı ilə deyil, DB həcmi, egress, realtime bağlantı/mesajları və email göndərişi ilə qiymətləndirmək lazımdır. Açılışdan əvvəl plan limitləri paneldə təsdiqlənməlidir.

Spamın xərci artırmaması üçün qeydiyyat qoruması, IP/istifadəçi üzrə server rate limit, task başlığı ölçüsü, atomik task yaratma kvotası və subscription sayı limiti nəzərdə tutulmalıdır. Auth rate limit-i task API-lərini avtomatik qorumur. Ödəniş tələb etmədən istifadəçiyə aydın və ağlabatan limit verilə bilər.

## Buraxılış üçün qəbul sınaqları

- A hesabı B hesabının task-ını ID-ni bilsə də oxuya, yeniləyə, silə və özünə keçirə bilmir.
- Anonim REST sorğuları və saxta/bitmiş sessiyalar məlumat əldə etmir.
- Realtime yalnız sahibin məlumatlarını çatdırır; logout sonrası köhnə məlumat görünmür.
- Xatırlatma yalnız sahibin cihazlarına gedir; cron sirrsiz sorğu rədd olunur.
- Paralel cron eyni reminder üçün ikinci iş yaratmır; müvəqqəti göndəriş xətasında retry var.
- Abunə endpoint-i qeyri-HTTPS/daxili host/key formatı/oversized payload üçün rədd edilir.
- 48 saat sərhədi, gecə keçidi, timezone, tətbiqin background-dan qayıtması yoxlanılır.
- Böyük dataset üçün siyahı səhifələri itkisizdir; mobil DOM və animasiya sayı sabitdir.
- Köhnə məlumat migration sınağında yalnız seçilmiş sahibə keçir, backup-dan bərpa yolu işləyir.

## Mənbələr

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Next.js server-side auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase: production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase: auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase: qiymətlər və plan limitləri](https://supabase.com/pricing)
