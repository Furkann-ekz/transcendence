// frontend/src/api/auth.ts

export async function loginUser(email, password) {
  const response = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Giriş başarısız oldu.');
  }

  return response.json(); // { token: "..." }
}

export async function registerUser(email, password, name) {
  const response = await fetch('http://localhost:3000/register', {
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