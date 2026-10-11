# Sayı Avı — Proje analizi ve TODO

Son inceleme: 9 Ekim 2026. Mobil uygulama bu depo (`-4numbergame`). Backend kardeş dizinde: `+4nubergamebackend/-4numbergamebackend`.

## Mevcut durum

- Expo SDK 57, React Native 0.86, dikey mobil oyun. Görünen ad kodda “Sayı Avı”; `app.json` adı hâlâ `-4numbergame`.
- Tek oyunculu 3, 4 ve 5 basamak. Kurallar `src/game/logic.ts` ve backend `src/games/game-logic.ts`. Çevrimiçi oyunda gizli sayı sunucuda.
- Ana sayfa, mağaza, rekorlar, nasıl oynanır, profil ve PvP bağlı. PvP oynanabilir; iki cihazla henüz doğrulanmadı.
- Giriş: misafir, e-posta/şifre, Google. Oturum `expo-secure-store`. Profilde ad, avatar, şifre değiştirme ve çıkış var.
- Altın, mağaza ve rekorlar hesaba bağlı. Çevrimdışı oyun `outbox` ile birikir. Mağaza alışverişi yalnızca çevrimiçi.
- Backend: NestJS + PostgreSQL, `/v1`. Kimlik, oyun, cüzdan, rekor, liderlik ve PvP WebSocket var. Birim testi oyun mantığı ve PvP servisinde. Mobilde test yok, ESLint yok.
- Navigasyon React Navigation. Expo Router’a geçilmeyecek (aşağıda karar).

## Önerilen hedef mimari

- Mobil: Expo / React Native (iOS ve Android).
- Sunucu: NestJS REST + PvP için Socket.IO.
- Kalıcı veri: PostgreSQL. Uygulama veritabanına bağlanmaz.
- Kimlik: misafir, e-posta/şifre, Google Sign-In. Uygulama Gmail parolası almaz.
- Misafir, kayıtlı hesaba dönüşünce aynı kullanıcı kalır. Çakışan e-postada misafir ilerlemesi birleşmez (aşağıda açık madde).
- Altın ve satın alma sunucuda, `gold_transactions` içinde tekil `ref` ile.
- Belirteçler güvenli depoda. Veritabanı ve OAuth sırrı mobil uygulamada yok.

## TODO

### P0 — Ürün kararları ve temel hazırlık

- [x] Misafir, e-posta/şifre ve Google girişinin ilk sürümde destekleneceğini doğrula.
- [x] Navigasyon: React Navigation’da kal. Expo Router’a taşıma; `AGENTS.md` buna göre güncellendi.
- [ ] Hesap silme yok (karar duruyor). E-posta doğrulama, şifre sıfırlama ve “misafir Google’a bağlanırken e-posta doluysa ne olur” kuralını yaz. Şu an dolu e-postada mevcut hesap açılır, misafirin altın ve rekoru geride kalır.
- [ ] Mağaza adı, paket kimliği ve ikonlar var (`com.cordelio.numbergame`, `assets/`). Görünen adı “Sayı Avı” yap, splash’i `app.json`’a bağla, gizlilik metni ve destek iletişimini ekle.
- [x] `app.json`’un gösterdiği ikon, adaptive icon ve favicon dosyaları `assets/` içinde duruyor.

### P1 — NestJS ve PostgreSQL temeli

- [x] NestJS API ayrı uygulamada. Sırlar ortam değişkeninden gelir.
- [ ] PostgreSQL migration ve yedek. Bağlantı var; `synchronize` yalnızca geliştirmede açık.
- [x] Veri modeli: kullanıcı, oyun, rekor, altın defteri, mağaza, PvP maç kaydı.
- [x] DTO doğrulaması, `/v1`, `GET /v1/health`.
- [ ] Üretimden önce CORS’u kısıtla (`enableCors()` şu an açık). Denetim izi ve loglama hâlâ tanımsız. Rate limit ve helmet var.
- [ ] Socket.IO paketleri backend `devDependencies` içinde (`@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`). Üretimde `devDependencies` kurulmazsa PvP açılmaz; `dependencies`e al.
- [ ] `.env.example` içinde gerçek gibi duran bir veritabanı parolası var. Yer tutucuya çevir; bu parola bir yerde kullanıldıysa değiştir. Google client secret bu akışta kullanılmıyor (kimlik belirteci doğrulanıyor); örnek dosyada ve sohbette duruyorsa yenile ve kaldır.

### P1 — Kimlik doğrulama ve misafir akışı

- [x] Misafir oturumu ve mevcut oturumu geri yükleme.
- [ ] E-posta doğrulama ve şifre sıfırlama. Kayıt ve giriş hazır.
- [ ] Google Sign-In kodlu (`src/auth/google.ts`). Expo Go’da çalışmaz; development build ile gerçek hesap şart.
- [x] Misafir → e-posta (`/auth/upgrade`) ve misafir → Google (`/auth/google/link`) aynı kullanıcıda kalır. E-posta başka hesapta kayıtlıysa misafir verisi birleşmez.
- [x] Erişim belirteci 1 saat. Yenileme anahtarı misafirde süresiz, kayıtlı hesapta 90 gün (kullandıkça uzar). Çıkışta sunucuda iptal.
- [x] Hesap silme yok. Şifre değiştirme `POST /auth/password`. Kayıtta şifre tekrarı ve en az 6 karakter var.
- [x] Belirteçler `expo-secure-store`.
- [ ] Google ile var olan e-posta hesabına girilince eski şifre siliniyor (doğrulanmamış e-posta ile ele geçirmeyi kesmek için). Bunu gizlilik metninde anlat.

### P2 — Veriyi buluta taşıma

- [x] Oyun `POST /games` ve `POST /games/:id/guesses`. İpucu `POST /games/:id/hints`. Sunucu yoksa çevrimdışı oyun; rekor ve harcama `POST /records/offline`.
- [x] Rekorlar `/records` ve `/leaderboard`. Doğrulanmamış rekor liderlikte yok.
- [x] Altın sunucuda. Çevrimdışı kazanç günde en fazla 200.
- [x] Altın, rekor ve mağaza kullanıcıya bağlı. Eski cihaz içi bakiye taşınmadı.
- [x] `clientId` ve defterdeki tekil `ref` çift ödülü keser.
- [x] Mağaza satın alma yalnızca çevrimiçi; donatma hesaba yazılır.
- [ ] Çevrimdışı rekor ve altın için cihaz / hesap başına ek sınır. İstemci istediği galibiyeti kuyruğa koyabilir.
- [ ] Çevrimdışı oyunda 100 tahmin sınırı yok. Sunucu `MAX_ATTEMPTS = 100`. Kaybedince `GameScreen` hemen yeni oyun açıyor; gizli sayı yeni oyunun hata satırında kalıyor.

### P2 — Mobil ekranlar ve hata durumları

- [x] Giriş, kayıt, misafir, Google, çıkış.
- [x] Profil ekranı: ad, avatar, şifre, misafir çıkış uyarısı.
- [ ] Yükleniyor, çevrimdışı, API hatası ve oturum süresi doldu hallerini her ekranda aynı dille göster. Oyun ve PvP’de kısmen var; mağaza ve rekorlar dağılmış.
- [ ] Kayıtlı hesapta eşitleme durumunu (çevrimiçi / kuyrukta bekleyen) görünür yap.
- [ ] API zaman aşımı ve 401 yenileme `src/auth/api.ts` içinde. Tekrar deneme politikası yok; PvP soketi bu istemciyi kullanmıyor.
- [ ] Ekran okuyucu, dinamik yazı, güvenli alan, küçük ekran.
- [ ] Ana sekme etiketi “Home”; diğerleri Türkçe. “Ana sayfa” yap.
- [ ] `package.json` `packageManager` alanı yarn diyor, kilit dosyası `package-lock.json`. Birini seç.

### P3 — Test, güvenlik ve yayın

- [ ] Backend entegrasyon testleri (kimlik, altın, çevrimdışı rekor, mağaza). Oyun mantığı ve PvP servisi birim testi var. Mobil test yok.
- [ ] Misafirden kayıtlı hesaba geçiş, oturum yenileme, çevrimdışı kuyruk ve eşzamanlı altın için uçtan uca test.
- [ ] Gerçek cihazda giriş, klavye, ağ kesintisi, PvP (iki oyuncu) ve yeniden başlatma.
- [ ] Gizlilik politikası ve mağaza izinleri. Hesap silme bilinçli olarak yok.
- [ ] Geliştirme / üretim ayrımı, CI, hata izleme, yedek.
- [ ] EAS development ve release derlemeleri. `eas.json` yok.
- [ ] İlk sürümden sonra reklam (AdMob). İsteğe bağlı ödüllü reklam düşünülüyor. Geçiş reklamı sık olmasın. ATT ve GDPR onayı gerekir.
- [x] PvP ilk sürüm: rastgele eşleşme, sıra tabanlı, kazanana 15 altın. İki mod: aynı gizli sayı, ya da herkes kendi sayısını yazıp rakibinin sayısını tahmin eder. Süre yalnızca sırası gelende 30 sn, kopma payı 60 sn. Bellek içi kuyruk, tek sunucu süreci.
- [ ] PvP: maç kaydı veritabanına yazılamazsa istemci yine de “+15 altın” gösteriyor. Ödülü kayıt başarılıysa göster.
- [ ] PvP sonraki adımlar: arkadaş daveti, birbirinin sayısını tahmin, Redis ile çoklu süreç, tahmin hız sınırı.
- [ ] Misafir temizliği `pvp_matches` satırını siliyor. Entity yorumu maç geçmişinin kullanıcı silinse de kalacağını söylüyor. Kayıtlı rakibin satırı da gidiyor; ikisini hizala.

## Önemli uygulama notları

- Google girişinde parola alınmaz. Backend kimlik belirtecini doğrular.
- Mobil istemciye veritabanı bilgisi veya OAuth sırrı eklenmez.
- Çevrimdışı altın istemci tahminiyle gösterilir; kesin tutarı sunucu keser.
- Oyun kuralı, ipucu fiyatı ve mağaza kimlikleri iki depoda kopya. Birini değiştirince diğerini de değiştir.
