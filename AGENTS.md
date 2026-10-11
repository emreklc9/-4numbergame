# Sayı Avı — ajan notları

Expo SDK 57 / React Native mobil oyunu. Ürün adı Sayı Avı; paket adı `-4numbergame`. Backend ayrı depodadır: `../../+4nubergamebackend/-4numbergamebackend` (NestJS, PostgreSQL, `/v1`, port 3003).

Kullanıcıyla Türkçe konuş. Kod ve mevcut yorumlar Türkçe kalabilir.

## Expo sürümü — eğitim verisine güvenme

Expo her SDK’da API kırar. Expo, EAS veya React Native API’sine dokunmadan önce:

1. `package.json` içindeki `expo` ana sürümünü oku (şu an 57).
2. Sürümlü dokümanı aç: `https://docs.expo.dev/versions/v57.0.0/`
3. Gerekirse `https://docs.expo.dev/llms.txt` indeksinden ilgili sayfaya git. Ezberden yazma.

## Komutlar

Kilit dosyası `package-lock.json`. Kurulum ve betikler npm ile yürür. `package.json` içindeki `packageManager: yarn` alanı kilit dosyasıyla çelişir; ikinci bir kilit dosyası ekleme.

```bash
npm install
npx expo install <paket>   # npm/yarn add yerine; SDK uyumlu sürüm seçer
npx expo start
npx expo run:ios           # native modül (Google Sign-In) için development build
npx expo run:android
npx tsc --noEmit
```

ESLint ve `expo lint` bu projede kurulu değil. Yeni bir iş bitince en azından `npx tsc --noEmit` çalıştır. Mobilde test betiği yok.

Backend (ayrı dizin): `npm run start:dev`, `npm test`. PvP ve WebSocket paketleri şu an `devDependencies` içinde; üretim kurulumunda düşer, `dependencies`e alınmadan prod’a çıkma.

## Navigasyon

**React Navigation** kullanılıyor (`App.tsx`: alt sekme + native stack). Ekranlar `src/screens/` altında. Expo Router yok, `src/app/` yok.

Kullanıcı açıkça istemedikçe Expo Router’a taşıma. Yeni ekran: `src/screens` + `RootStackParamList` / sekme kaydı.

## Native proje

`ios/` ve `android/` gitignore’da. Prebuild üretir. Elle düzenleme; native ayar `app.json` ve plugin’lerde. `ios/` veya `android/` yerelde duruyorsa bu, onları kaynağa al anlamına gelmez.

Expo Go, Google Sign-In gibi native modülleri içermez. Bu modülden sonra development build gerekir.

## Oyun kuralları

- 3 / 4 / 5 basamak. Rakamlar farklı. Gizli sayının ilk rakamı 0 değil.
- `+` doğru yer, `−` yanlış yer. Değerlendirme: `src/game/logic.ts` ve backend `src/games/game-logic.ts`. İkisini birlikte güncelle.
- Çevrimiçi oyunda gizli sayı sunucuda kalır. İstemciye bitmeden secret döndürme.
- Çevrimdışı galibiyet `src/game/outbox.ts` kuyruğuna yazılır (`clientId` ile tekil). Sunucu bunları doğrulanmamış sayar; liderlik tablosuna koyma.
- Altın formülü iki tarafta `max(21 - tahmin, 1)`. İpucu maliyeti 1. Mağaza kataloğu `src/game/store.ts` ile backend `wallet.constants.ts` içinde aynı id’lerle durur; fiyat veya id değişince ikisini de güncelle.
- PvP bellek içi, tek süreç ve sıra tabanlıdır. İki mod vardır ve kuyrukları ayrıdır: `shared` aynı gizli sayı, `duel` herkes kendi sayısını yazar ve rakibinin sayısını tahmin eder. Süre yalnızca sırası gelen oyuncuda işler; tahmin bitince rakibin 30 saniyesi başlar. Sayı yazma adımında ikisinin de 30 saniyesi birlikte işler. Süreler backend `pvp.constants.ts`: 30 sn, kopma 60 sn, ödül 15 altın, 4 basamak.

## Güvenlik

- Uygulamaya PostgreSQL bilgisi, `JWT_SECRET` veya Google client secret koyma. Google istemci kimlikleri `src/auth/google.ts` ve `app.json` içindedir; bunlar gizli değildir.
- Oturum `expo-secure-store`. API adresi yalnızca `EXPO_PUBLIC_API_URL` (`src/config.ts`).
- Altın, rekor ve satın alma istemcinin söylediği bakiyeye güvenmez. Yeni ödül veya harcama sunucu işlemi ve `gold_transactions.ref` ile tekil olmalı.
- Backend CORS şu an herkese açık, `synchronize` üretim dışında açık. Üretim değişikliğinde ikisini de sıkılaştır; migration’sız şema değişikliğini prod varsayma.

## Kaplama ve ilerideki kaçış yolu

Bugünkü sürüm sade sayı tahmin oyunu olarak kalır. Oynanış, ekran akışı ve kurallar değişmez.

Kaçış teması yalnızca görünümdür: siyah kilit kutusu, yeşil rakam. Banka soygunu, düşman takibi veya durak durak şifre rotası bu sürüme girmez. Kullanıcı açıkça istemedikçe yeni mod, harita veya senaryo ekranı ekleme.

İleride denenebilecek yol, ayrı bir kaçış modudur: her durakta bugünkü tahmin döngüsü, bitince sonraki kilit. O da kural değiştirmez; `+` / `−` aynı kalır. Bu fikir nottur, görev değildir.

## Dokunma

- `TODO.md` güncel ürün listesidir. Bitmiş maddenin üzerine aynı işi yeniden yazma.
- Reklam (AdMob) ilk sürümden sonra. Kullanıcı istemedikçe ekleme.
