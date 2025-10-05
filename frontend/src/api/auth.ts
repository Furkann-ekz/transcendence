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

export async function validateSessionOnServer(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch(`${API_URL}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.ok; // 200 OK dönerse true, 401 Unauthorized gibi durumlarda false döner.
    } catch (error) {
        console.error("Session validation request failed:", error);
        return false;
    }
}