const API_URL = `/api`;

// Arkadaş listesini, gelen ve giden istekleri getirir.

export async function getFriends() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/friends`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch friends list.');
  return response.json();
}

// YENİ FONKSİYON: İki kullanıcı arasındaki durumu getirir.
export async function getFriendshipStatus(targetId: number) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/friends/status/${targetId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch friendship status.');
  return response.json();
}


// Belirtilen kullanıcıya arkadaşlık isteği gönderir.
export async function sendFriendRequest(targetId: number) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/friends/request/${targetId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send friend request.');
  }
  return response.json();
}

// Gelen bir arkadaşlık isteğini kabul eder veya reddeder.
export async function respondToFriendRequest(friendshipId: number, accept: boolean) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/friends/respond/${friendshipId}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ accept })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to respond to friend request.');
  }
  return response.json();
}

// Bir arkadaşlığı veya bekleyen isteği kaldırır.
export async function removeFriendship(friendshipId: number) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/friends/by-ship/${friendshipId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to remove friendship.');
  }
  return response.json();
}

// Bir kullanıcıyı engeller.
export async function blockUser(targetId: number) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(`${API_URL}/users/${targetId}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to block user.');
    }
    return response.json();
}

// Bir kullanıcının engelini kaldırır.
export async function unblockUser(targetId: number) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(`${API_URL}/users/${targetId}/unblock`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unblock user.');
    }
    return response.json();
}

export async function getUserProfile(userId: string) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch user profile.');
  }
  return response.json();
}

export async function getMatchHistory(userId: string) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/users/${userId}/matches`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
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
    headers: { 'Authorization': `Bearer ${token}` },
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

export async function changePassword(passwordData: { currentPassword: string, newPassword: string }) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_URL}/profile/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(passwordData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to change password.');
  }
  return response.json();
}