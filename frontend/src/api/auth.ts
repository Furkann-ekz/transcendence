// frontend/src/api/auth.ts
import { apiFetch } from './api'; // Standart fetch yerine kendi fonksiyonumuzu import et

const API_URL = '/api';

export async function loginUser(email: string, password: string) {
  // 'fetch' yerine 'apiFetch' kullan. Header'lar otomatik eklenecek.
  const response = await apiFetch(`${API_URL}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Giriş başarısız oldu.');
  }
  return response.json();
}

export async function registerUser(email: string, password: string, name: string) {
  // 'fetch' yerine 'apiFetch' kullan
  const response = await apiFetch(`${API_URL}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Kayıt başarısız oldu.');
  }
  return response.json();
}