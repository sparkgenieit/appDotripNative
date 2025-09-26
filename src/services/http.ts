// src/services/http.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';

export async function api(path: string, init?: RequestInit) {
  const token = await AsyncStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers });

  // IMPORTANT: use clone() so we don't consume the original body
  if (__DEV__ && !res.ok) {
    const body = await res.clone().text().catch(() => '');
    console.log('[api fail]', res.status, path, body.slice(0, 300));
  }

  return res;
}
