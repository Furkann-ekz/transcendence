const API_URL = `/api`;

export async function getUserProfile(userId: string) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch user profile.');
  }

  return response.json();
}

export async function getMatchHistory(userId: string) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/users/${userId}/matches`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch match history.');
  }

  return response.json();
}

// Mevcut (giriş yapmış) kullanıcının profilini getirir.
export async function getCurrentUserProfile() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch current user profile.');
  }
  return response.json();
}

// Mevcut kullanıcının profilini günceller.
export async function updateUserProfile(data: { name: string }) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile.');
  }
  return response.json();
}