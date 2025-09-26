// src/services/authWebCompat.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';

// Dev fallback (match web .env usage) — set these in your native .env too if you want
const WEB_EMAIL = process.env.EXPO_PUBLIC_API_EMAIL || process.env.API_EMAIL || '';
const WEB_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD || process.env.API_PASSWORD || '';

async function loginWithEnvCredentials() {
  if (!WEB_EMAIL || !WEB_PASSWORD) throw new Error('No env credentials defined');
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: WEB_EMAIL, password: WEB_PASSWORD }),
  });
  if (!res.ok) throw new Error('Env login failed');
  const data = await res.json();
  // not persisted on purpose; dev-only
  return data?.access_token as string;
}

export async function fetchWithRefreshNative(path: string, init: RequestInit = {}) {
  // 1) try real user token (saved after LoginScreen success)
  let token = await AsyncStorage.getItem('access_token');

  // 2) if missing, dev-fallback to env creds (web-style)
  if (!token) {
    try {
      token = await loginWithEnvCredentials();
    } catch {
      // proceed without token if endpoint is public
      token = '';
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
