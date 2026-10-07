# Sayı Avı — Proje analizi ve TODO

## Mevcut durum

- Expo ve React Native ile geliştirilmiş, dikey kullanım odaklı bir mobil oyun.
- Tek oyunculu sayı tahmin oyunu; 3, 4 ve 5 basamaklı modlar var.
- Oyun akışı, tahmin kontrolü ve ipuçları `src/game/logic.ts` ve `src/screens/GameScreen.tsx` içinde.
- Ana ekran, mağaza ve rekorlar ekranı mevcut. PvP ekranda henüz kullanılamıyor.
- Giriş ekranı (misafir ve e-posta/şifre) var; oturum `expo-secure-store` ile saklanıyor.
- Oyun, altın, mağaza ve rekorlar sunucuda (hesaba bağlı). Çevrimdışıyken oyun, rekor ve altın kazanma/harcama cihazda `outbox` içinde birikir; mağazadan satın alma yalnızca çevrimiçiyken yapılır.
- Ayrı bir NestJS + PostgreSQL backend var (`+4nubergamebackend`): misafir/e-posta/Google girişi, sunucu taraflı oyun doğrulama (`/games`), rekorlar ve liderlik tablosu.
- Navigasyonda React Navigation kullanılıyor. `AGENTS.md` ise Expo Router kullanımını tarif ediyor; yeni ekranlar eklenmeden önce bu tercih netleştirilmeli, sırf bu yüzden mevcut navigasyon hemen taşınmamalı.
- `app.json`, iOS, Android ve web yapılandırması içeriyor; Android/iOS için gerçek cihaz testi ve mağaza dağıtımı ayrıca yapılmalı.

## Önerilen hedef mimari

- Mobil uygulama: Expo / React Native (iOS ve Android).
- Sunucu: NestJS REST API.
- Kalıcı veri: PostgreSQL; mobil uygulama PostgreSQL'e doğrudan bağlanmaz, tüm erişim API üzerinden yapılır.
- Kimlik yöntemleri: misafir oturumu, e-posta/şifre ve Google ile giriş. “Gmail ile giriş”, Google OAuth/Google Sign-In anlamına gelir; kullanıcının Gmail parolasını uygulama almamalı.
- Misafirden kayıtlı hesaba geçişte aynı kullanıcı verisini koruyacak hesap bağlama akışı.
- Sunucu tarafında kullanıcı, giriş sağlayıcıları, oyun kayıtları, altın hareketleri ve envanter tutulur. Altın ve satın alma gibi değerli işlemlerin doğruluğu istemciye bırakılmaz.
- Erişim/yenileme belirteçleri güvenli biçimde saklanır; PostgreSQL bağlantı bilgileri ve OAuth sırları mobil uygulamaya konmaz.

## TODO

### P0 — Ürün kararları ve temel hazırlık

- [x] Misafir, e-posta/şifre ve Google girişinin ilk sürümde destekleneceğini doğrula.
- [ ] Hesap silme, e-posta doğrulama, şifre sıfırlama ve misafir verisini hesaba aktarma kurallarını belirle.
- [ ] React Navigation ile devam mı edilecek, Expo Router'a geçiş mi yapılacak karar ver.
- [ ] iOS ve Android için uygulama adı, paket/bundle kimlikleri, ikonlar, gizlilik metni ve destek iletişim bilgilerini tamamla.
- [ ] `app.json` içinde referans verilen görsel dosyalarının projede bulunduğunu doğrula.

### P1 — NestJS ve PostgreSQL temeli

- [x] NestJS API projesini ayrı bir uygulama olarak kur; yapılandırma ve sırları ortam değişkenlerinden yükle. (Ayrı depo: `-4numbergamebackend`)
- [ ] PostgreSQL için migration akışını ve yedekleme yaklaşımını kur. (Bağlantı ve yerel veritabanı hazır; `synchronize` yalnızca geliştirmede açık.)
- [ ] Veri modelini tamamla: kullanıcılar, oyunlar ve rekorlar hazır; altın işlem defteri ve mağaza envanteri de hazır.
- [x] DTO doğrulaması, API sürümleme (`/v1`) ve sağlık kontrolü uç noktası ekle.
- [ ] Denetim izi ve loglama gereksinimlerini tanımla. (Rate limit ve helmet hazır; CORS hâlâ tamamen açık, üretimden önce kısıtlanmalı.)

### P1 — Kimlik doğrulama ve misafir akışı

- [x] Misafir oturumu oluşturma ve mevcut oturumu geri yükleme akışı.
- [ ] E-posta doğrulama ve şifre sıfırlama ekle. (Kayıt ve giriş hazır.)
- [ ] Mobilde Google Sign-In'i bağla. Backend (`/auth/google`, `/auth/google/link`) hazır. Gerekenler: Android ve iOS OAuth istemcileri, development build, `GOOGLE_CLIENT_ID` listesine yeni kimlikler. Sohbette paylaşılan Client Secret yenilenmeli.
- [x] Hesap bağlama ve çakışan e-posta durumlarını güvenli biçimde ele al. (Misafir → e-posta/Google dönüşümü hazır.)
- [x] Oturum sona ermesi ve çıkış: erişim belirteci 1 saat, yenileme anahtarı misafirde süresiz, kayıtlı hesapta 90 gün (kullandıkça uzar); çıkışta sunucuda iptal edilir.
- [ ] Hesap silme davranışını mobil uygulama ve API'de uygula.
- [x] Oturum belirteçlerini güvenli yerel depolamada sakla (`expo-secure-store`).

### P2 — Veriyi buluta taşıma

- [x] Oyunu `POST /games` ve `POST /games/:id/guesses` üzerinden oyna. Sunucuya ulaşılamazsa çevrimdışı oynanır; rekorlar cihazdaki outbox'ta birikir ve `POST /records/offline` ile "doğrulanmamış" olarak toplu gönderilir.
- [x] Rekorlar ekranında `/records` ve `/leaderboard` verilerini göster (doğrulanmamış rekorları ayırt et).
- [x] Altın bakiyesini sunucuya taşı. Kazanç ve ipucu maliyeti sunucuda atomik düşer; çevrimdışı kazanç günde en fazla 200 altınla sınırlı.
- [x] Altın, rekor ve mağaza verilerinin sahipliğini kullanıcı hesabıyla ilişkilendir. (Eski cihaz içi altın/rekorlar aktarılmadı.)
- [x] Tekrar denemelerde çift kayıt/çift ödül oluşmasını engelle (`clientId` + işlem defterinde tekil `ref`).
- [x] Oyun rekorlarını sunucuya kaydet ve kullanıcının rekorlarını API'den getir.
- [x] Altın kazanma/harcama hareketlerini sunucuda atomik işlem olarak uygula (`gold_transactions`).
- [x] Mağaza satın alma (yalnızca çevrimiçi) ve donatma durumunu hesaplar arasında eşitle.
- [ ] Çevrimdışı kazanılan altının ve rekorların kötüye kullanımına karşı ek kurallar (ör. cihaz başına sınır) değerlendir.

### P2 — Mobil ekranlar ve hata durumları

- [x] Giriş, kayıt, misafir devam etme ve çıkış akışını ekle. (Ayrı bir hesap ekranı henüz yok.)
- [ ] Yükleniyor, çevrimdışı, API hatası ve oturum süresi doldu durumlarını ekranlarda anlaşılır göster.
- [ ] Kayıtlı kullanıcı için hesap/ eşitleme durumunu görünür kıl.
- [ ] API istemcisini tek noktada topla; zaman aşımı, tekrar deneme ve kimlik belirteci yenilemesini yönet.
- [ ] Ekran okuyucu, dinamik yazı boyutu, güvenli alanlar ve küçük/büyük ekran düzenlerini kontrol et.

### P3 — Test, güvenlik ve yayın

- [ ] NestJS servisleri için birim testleri ve API akışları için entegrasyon testleri yaz. (Oyun mantığı için birim testi var.)
- [ ] Misafirden Google/e-posta hesabına geçiş, oturum yenileme, çevrimdışı kullanım ve eşzamanlı altın işlemlerini uçtan uca test et.
- [ ] iOS ve Android gerçek cihazlarında giriş, klavye, ağ kesintisi ve uygulama yeniden başlatma senaryolarını doğrula.
- [ ] Gizlilik politikası, hesap/veri silme süreci ve mağaza izinlerini tamamla.
- [ ] Geliştirme ve üretim ortamlarını ayır; CI, hata izleme ve yedekleme/geri yükleme sürecini kur.
- [ ] EAS ile iOS ve Android test/release derlemeleri al; mağaza gönderiminden önce sürüm kontrol listesi uygula.

## Önemli uygulama notları

- Google ile girişte kullanıcı parolası alınmaz; Google kimlik doğrulamasını sağlayıcı yürütür ve backend alınan belirteci doğrular.
- Mobil istemciye PostgreSQL kullanıcı adı/parolası veya sunucu OAuth sırrı eklenmez.
- Misafir ilerlemesi hesapla birleştirilirken, özellikle altın bakiyesi/ödüller için istemcinin gönderdiği değerlere güvenilmez; sunucu tarafı doğrulama ve işlem kaydı gerekir.
