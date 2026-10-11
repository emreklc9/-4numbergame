# Sayı Avı

Dikey mobil sayı tahmin oyunu. Gizli sayıdaki rakamlar birbirinden farklıdır, ilk rakam 0 olamaz. Tahmin sonucu `+` (doğru rakam, doğru yer) ve `−` (doğru rakam, yanlış yer) olarak döner.

Uygulama Expo / React Native. Hesap, oyun doğrulama, altın, mağaza, rekorlar ve PvP ayrı bir NestJS + PostgreSQL API’dedir: `../../+4nubergamebackend/-4numbergamebackend` (port `3003`, önek `/v1`).

## Oyun

- Tek oyunculu modlar: 3, 4 ve 5 basamak. Sunucu oyunu açarsa gizli sayı istemciye gitmez; tahmin ve ipucu `POST /v1/games` üzerinden doğrulanır.
- Sunucuya ulaşılamazsa oyun cihazda devam eder. Galibiyet ve ipucu harcaması hesaba özel bir kuyruğa yazılır, bağlantı gelince `POST /v1/records/offline` ile gönderilir. Bu rekorlar liderlik tablosuna girmez.
- Kazanma ödülü `max(21 - tahmin sayısı, 1)` altın. İpucu (rakam aç veya ele) 1 altın. Çevrimdışı kazanç günde en fazla 200 altın.
- PvP: 4 basamak, rastgele eşleşme, sıra tabanlı, WebSocket (`/pvp`). İki mod: aynı gizli sayı, ya da herkesin kendi sayısını yazıp rakibinin sayısını tahmin etmesi. Kuyruklar karışmaz. Kuyrukta bekleyen önce oynar. Süre yalnızca sırası gelenin 30 saniyesidir; tahmin bitince rakibin süresi başlar. Sayı yazarken ikisinin de 30 saniyesi vardır. Kopunca dönüş süresi 60 sn. Kazanana 15 altın.
- Mağaza yalnızca çevrimiçiyken alışveriş yapar. Tema, tuş takımı ve zafer efekti hesaba yazılır.

## Mobil uygulamayı çalıştırma

```bash
npm install
npx expo start
```

Google ile giriş native modül ister; Expo Go yetmez. Geliştirme derlemesi:

```bash
npx expo run:ios
npx expo run:android
```

Gerçek cihazda API adresi gerekir. Örnek: `EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:3003/v1` (`.env.local` veya kabuk). Tanımsızsa iOS simülatör `localhost:3003`, Android emülatör `10.0.2.2:3003` kullanır.

Tip kontrolü: `npx tsc --noEmit`. ESLint kurulu değil.

`ios/` ve `android/` yerelde prebuild ile oluşur ve git’e girmez. Native davranışı `app.json` ve config plugin’lerden ayarla; bu klasörleri elle düzenleme.

## Backend’i çalıştırma

Ayrı depoda:

```bash
cd ../../+4nubergamebackend/-4numbergamebackend
npm install
cp .env.example .env
npm run start:dev
```

`.env` içine veritabanı, `JWT_SECRET` ve `GOOGLE_CLIENT_ID` yazılır. Bu değerler mobil uygulamaya konmaz. Geliştirmede tablolar `synchronize` ile açılır; üretimde migration gerekir. Sağlık kontrolü: `GET /v1/health`.

## Ekranlar

Alt sekmeler: Mağaza, ana sayfa, Rekorlar. Ana sayfadan tek oyun, PvP, nasıl oynanır ve profil açılır. Giriş yoksa misafir, e-posta/şifre veya Google ekranı gelir. Misafir hesap e-posta veya Google ile aynı kullanıcıya dönüştürülebilir.

## Dizin

```
App.tsx                 React Navigation (sekme + yığın)
src/screens             Ekranlar
src/auth                Oturum, API istemcisi, Google
src/game                Oyun kuralları, çevrimdışı kuyruk, mağaza
src/profile             Avatarlar
src/components          Logo, yükleme, konfeti
```

Oyun kuralının kopyası backend’de `src/games/game-logic.ts`. İki taraf birlikte değişmeli.
