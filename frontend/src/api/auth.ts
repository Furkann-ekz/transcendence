// frontend/src/api/auth.ts

// Ortam değişkeninden API adresini alıyoruz
const API_URL = '/api';

// DÜZELTME: Parametrelere ': string' tipi eklendi
export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Giriş başarısız oldu.');
  }

  return response.json();
}

// DÜZELTME: Parametrelere ': string' tipi eklendi
export async function registerUser(email: string, password: string, name: string) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Kayıt başarısız oldu.');
  }

  return response.json();
}