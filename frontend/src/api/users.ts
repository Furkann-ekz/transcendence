// frontend/src/api/users.ts
import { apiFetch } from './api';

const API_URL = `/api`;

export async function getFriends() {
  const response = await apiFetch(`${API_URL}/friends`);
  if (!response.ok) throw new Error('Failed to fetch friends list.');
  return response.json();
}

export async function getFriendshipStatus(targetId: number) {
  const response = await apiFetch(`${API_URL}/friends/status/${targetId}`);
  if (!response.ok) throw new Error('Failed to fetch friendship status.');
  return response.json();
}

export async function sendFriendRequest(targetId: number) {
  const response = await apiFetch(`${API_URL}/friends/request/${targetId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send friend request.');
  }
  return response.json();
}

export async function respondToFriendRequest(friendshipId: number, accept: boolean) {
  const response = await apiFetch(`${API_URL}/friends/respond/${friendshipId}`, {
    method: 'POST',
    body: JSON.stringify({ accept })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to respond to friend request.');
  }
  return response.json();
}

export async function removeFriendship(friendshipId: number) {
  const response = await apiFetch(`${API_URL}/friends/by-ship/${friendshipId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to remove friendship.');
  }
  return response.json();
}

export async function blockUser(targetId: number) {
    const response = await apiFetch(`${API_URL}/users/${targetId}/block`, {
        method: 'POST',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to block user.');
    }
    return response.json();
}

export async function unblockUser(targetId: number) {
    const response = await apiFetch(`${API_URL}/users/${targetId}/unblock`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unblock user.');
    }
    return response.json();
}

export async function getUserProfile(userId: string) {
  const response = await apiFetch(`${API_URL}/users/${userId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch user profile.');
  }
  return response.json();
}

export async function getMatchHistory(userId: string) {
  const response = await apiFetch(`${API_URL}/users/${userId}/matches`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch match history.');
  }
  return response.json();
}

export async function getCurrentUserProfile() {
  const response = await apiFetch(`${API_URL}/profile`);
  if (!response.ok) {
    throw new Error('Failed to fetch current user profile.');
  }
  return response.json();
}

export async function updateUserProfile(data: { name: string }) {
  const response = await apiFetch(`${API_URL}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile.');
  }
  return response.json();
}

export async function changePassword(passwordData: { currentPassword: string, newPassword: string }) {
  const response = await apiFetch(`${API_URL}/profile/change-password`, {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to change password.');
  }
  return response.json();
}

// YENİ EKLENEN FONKSİYON: Avatar yüklemesi için
export async function updateUserAvatar(formData: FormData) {
  const response = await apiFetch('/api/profile/avatar', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Avatar yüklenemedi.');
  }
  return response.json();
}