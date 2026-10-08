// Google istemci kimlikleri gizli değildir; Client Secret uygulamaya konmaz.
const WEB_CLIENT_ID = '527646470798-h9u5ds4qj3d66cv1hsnjn90shqi1mhe9.apps.googleusercontent.com';
const IOS_CLIENT_ID = '527646470798-qi6tpmkf2dkh3b6oo0t6ulh0eafi9edp.apps.googleusercontent.com';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let configured: GoogleModule | null = null;

// Native modül Expo Go'da yoktur; ilk kullanımda yüklenir ki uygulama açılışta çökmesin.
function load(): GoogleModule {
  if (configured) return configured;
  let mod: GoogleModule;
  try {
    mod = require('@react-native-google-signin/google-signin');
    mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
  } catch {
    throw new Error('Google girişi için development build gerekir (Expo Go desteklemez)');
  }
  configured = mod;
  return mod;
}

// İptal edilirse null döner.
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = load();
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google kimlik belirteci alınamadı');
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Hizmetleri kullanılamıyor');
      }
    }
    throw error instanceof Error ? error : new Error('Google ile giriş başarısız');
  }
}
