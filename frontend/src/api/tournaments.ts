// frontend/src/api/tournaments.ts -> DÜZELTİLMİŞ VERSİYON

const API_URL = `/api/tournaments`;
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
});

// Aktif turnuvaların listesini getirir.
export async function getTournaments() {
    const response = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Turnuvalar yüklenemedi.');
    return response.json();
}

// Belirli bir turnuvanın detaylarını getirir.
export async function getTournamentDetails(id: string) {
    const response = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Turnuva detayları alınamadı.');
    return response.json();
}

// Yeni bir turnuva oluşturur.
export async function createTournament() {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        // EKLENEN SATIR: Boş da olsa geçerli bir JSON gövdesi ekliyoruz.
        body: JSON.stringify({}) 
    });
    if (!response.ok) throw new Error('Turnuva oluşturulamadı.');
    return response.json();
}

// Bir turnuvaya katılır/kayıt olur.
export async function joinTournament(tournamentId: string) {
    const response = await fetch(`${API_URL}/${tournamentId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        // EKLENEN SATIR: Bu istek de POST olduğu için buna da ekleyelim.
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuvaya kayıt olunamadı.');
    }
    return response.json();
}

export async function setReadyStatus(tournamentId: string, isReady: boolean) {
    const response = await fetch(`${API_URL}/${tournamentId}/ready`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isReady }) // Body'de durumu gönderiyoruz
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Durum güncellenemedi.');
    }
    return response.json();
}

// Bir turnuvadan ayrılmayı sağlar.
export async function leaveTournament(tournamentId: string) {
    const response = await fetch(`${API_URL}/${tournamentId}/leave`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        // EKLENEN SATIR: Boş da olsa geçerli bir JSON gövdesi ekliyoruz.
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuvadan ayrılamadı.');
    }
    return response.json();
}

export async function startTournament(tournamentId: string) {
    const response = await fetch(`${API_URL}/${tournamentId}/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Turnuva başlatılamadı.');
    }
    return response.json();
}

export async function getMyActiveTournament() {
    const response = await fetch(`${API_URL}/my-active-tournament`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Could not check for active tournament.');
    }
    // Eğer cevap boşsa (204 No Content), null döndür
    if (response.status === 204) {
        return null;
    }
    return response.json();
}