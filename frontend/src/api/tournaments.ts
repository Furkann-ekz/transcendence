// frontend/src/api/tournaments.ts
import { apiFetch } from './api';

const API_URL = `/api/tournaments`;

export async function getTournaments() {
    const response = await apiFetch(API_URL);
    if (!response.ok) throw new Error('Turnuvalar yüklenemedi.');
    return response.json();
}

export async function getTournamentDetails(id: string) {
    const response = await apiFetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Turnuva detayları alınamadı.');
    return response.json();
}

export async function createTournament() {
    const response = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({}) 
    });
    if (!response.ok) throw new Error('Turnuva oluşturulamadı.');
    return response.json();
}

export async function joinTournament(tournamentId: string) {
    const response = await apiFetch(`${API_URL}/${tournamentId}/join`, {
        method: 'POST',
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuvaya kayıt olunamadı.');
    }
    return response.json();
}

export async function setReadyStatus(tournamentId: string, isReady: boolean) {
    const response = await apiFetch(`${API_URL}/${tournamentId}/ready`, {
        method: 'POST',
        body: JSON.stringify({ isReady })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Durum güncellenemedi.');
    }
    return response.json();
}

export async function leaveTournament(tournamentId: string) {
    const response = await apiFetch(`${API_URL}/${tournamentId}/leave`, {
        method: 'DELETE',
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuvadan ayrılamadı.');
    }
    return response.json();
}

export async function startTournament(tournamentId: string) {
    const response = await apiFetch(`${API_URL}/${tournamentId}/start`, {
        method: 'POST',
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuva başlatılamadı.');
    }
    return response.json();
}

export async function getMyActiveTournament() {
    const response = await apiFetch(`${API_URL}/my-active-tournament`);
    if (!response.ok) {
        throw new Error('Could not check for active tournament.');
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}