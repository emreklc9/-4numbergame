import { Platform } from 'react-native';

// Gerçek cihazda .env.local içine EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:3003/v1 yazılmalı.
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost}:3003/v1`;
